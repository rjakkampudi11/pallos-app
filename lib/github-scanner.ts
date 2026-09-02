import "server-only";

import { scanRepositoryFiles, type ScanFile } from "@/lib/code-scanner";
import { githubFetch, installationToken } from "@/lib/github-app";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { assessCodeScan } from "@/lib/security-assessment";
import { scanDependencies } from "@/lib/dependency-scanner";

type TreeEntry = { path: string; type: "blob" | "tree"; sha: string; size?: number };
type TreeResponse = { sha: string; tree: TreeEntry[]; truncated: boolean };
type BlobResponse = { content: string; encoding: string; size: number };
type CommitResponse = { sha: string; commit: { tree: { sha: string } } };
type CommitListItem = { sha: string };
type CommitDetail = { files?: Array<{ filename: string; patch?: string }> };

export type GitHubRepositoryRecord = {
  id: string;
  user_id: string;
  installation_id: number | string;
  owner_login: string;
  name: string;
  full_name: string;
  default_branch: string;
};

type RunOptions = {
  repository: GitHubRepositoryRecord;
  triggerType?: "manual" | "push" | "pull_request";
  commitRef?: string;
  branchRef?: string;
  deliveryId?: string;
  pullRequestNumber?: number;
  baseCommitSha?: string;
};

const allowedExtensions = /\.(?:[cm]?[jt]sx?|py|rb|go|java|cs|php|rs|swift|kt|sql|env|ya?ml|json|toml)$/i;
const allowedNames = /(?:^|\/)(?:Dockerfile|Procfile|\.env\.example|\.gitignore)$/i;
const ignoredPaths = /(?:^|\/)(?:node_modules|vendor|dist|build|\.next|coverage|public\/assets)(?:\/|$)/i;
const ignoredFiles = /(?:^|\/)(?:npm-shrinkwrap\.json|composer\.lock|Cargo\.lock|bun\.lockb?|yarn\.lock|pnpm-lock\.ya?ml)$/i;

function eligible(entry: TreeEntry) {
  const byteLimit = /(?:^|\/)package-lock\.json$/i.test(entry.path) ? 2_000_000 : 300_000;
  return entry.type === "blob" && !ignoredPaths.test(entry.path) && !ignoredFiles.test(entry.path) && (allowedExtensions.test(entry.path) || allowedNames.test(entry.path)) && (entry.size ?? 0) <= byteLimit;
}

async function loadRecentHistorySecretFindings(token: string, owner: string, name: string) {
  const commits = await githubFetch<CommitListItem[]>(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/commits?per_page=10`, token).catch(() => []);
  const historyFiles: ScanFile[] = [];
  for (const commit of commits) {
    const detail = await githubFetch<CommitDetail>(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/commits/${encodeURIComponent(commit.sha)}`, token).catch((): CommitDetail => ({}));
    for (const file of detail.files || []) {
      if (!file.patch) continue;
      historyFiles.push({ path: `git-history/${commit.sha.slice(0, 8)}/${file.filename}`, content: file.patch });
    }
  }
  return scanRepositoryFiles(historyFiles).filter((finding) => finding.rule_id.startsWith("secret-"));
}

async function loadFiles(token: string, owner: string, name: string, entries: TreeEntry[]) {
  const files: ScanFile[] = [];
  let totalBytes = 0;
  for (let start = 0; start < entries.length && files.length < 150 && totalBytes < 3_000_000; start += 8) {
    const batch = entries.slice(start, start + 8);
    const loaded = await Promise.all(batch.map(async (entry) => {
      const blob = await githubFetch<BlobResponse>(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/git/blobs/${entry.sha}`, token);
      if (blob.encoding !== "base64" || totalBytes + blob.size > 3_000_000) return null;
      totalBytes += blob.size;
      return { path: entry.path, content: Buffer.from(blob.content.replace(/\n/g, ""), "base64").toString("utf8") };
    }));
    files.push(...loaded.filter((file): file is ScanFile => Boolean(file)));
  }
  return files;
}

export async function runGitHubRepositoryScan({ repository, triggerType = "manual", commitRef, branchRef, deliveryId, pullRequestNumber, baseCommitSha }: RunOptions) {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase is not configured.");

  if (deliveryId) {
    const { data: existing } = await supabase.from("pallos_code_scans").select("*").eq("user_id", repository.user_id).eq("github_delivery_id", deliveryId).maybeSingle();
    if (existing) return { scan: existing, findings: [], treeTruncated: false, duplicate: true };
  }

  const { data: scan, error: scanError } = await supabase.from("pallos_code_scans").insert({
    user_id: repository.user_id,
    repository_id: repository.id,
    status: "running",
    trigger_type: triggerType,
    branch_ref: branchRef || `refs/heads/${repository.default_branch}`,
    github_delivery_id: deliveryId || null,
    pull_request_number: pullRequestNumber || null,
    base_commit_sha: baseCommitSha || null,
  }).select("*").single();
  if (scanError || !scan) {
    if (deliveryId && scanError?.code === "23505") {
      const { data: existing } = await supabase.from("pallos_code_scans").select("*").eq("user_id", repository.user_id).eq("github_delivery_id", deliveryId).maybeSingle();
      if (existing) return { scan: existing, findings: [], treeTruncated: false, duplicate: true };
    }
    throw new Error(scanError?.message || "Could not start scan.");
  }

  try {
    const token = await installationToken(Number(repository.installation_id));
    const owner = repository.owner_login;
    const name = repository.name;
    const requestedRef = commitRef || repository.default_branch;
    const commit = await githubFetch<CommitResponse>(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/commits/${encodeURIComponent(requestedRef)}`, token);
    const tree = await githubFetch<TreeResponse>(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/git/trees/${encodeURIComponent(commit.commit.tree.sha)}?recursive=1`, token);
    const files = await loadFiles(token, owner, name, tree.tree.filter(eligible).slice(0, 300));
    const [dependencyScan, historyFindings] = await Promise.all([
      scanDependencies(files),
      triggerType === "pull_request" ? Promise.resolve([]) : loadRecentHistorySecretFindings(token, owner, name),
    ]);
    const findings = [...scanRepositoryFiles(files), ...dependencyScan.findings, ...historyFindings];
    const assessment = assessCodeScan(files, findings, tree.truncated, dependencyScan.checked);

    const [{ data: priorActive }, { data: dispositions }] = await Promise.all([
      supabase.from("pallos_code_findings").select("id,fingerprint,source_hash,status").eq("repository_id", repository.id).eq("user_id", repository.user_id).in("status", ["open", "false_positive", "accepted_risk", "intended_behavior"]),
      supabase.from("pallos_finding_dispositions").select("fingerprint,source_hash,disposition,reason").eq("repository_id", repository.id).eq("user_id", repository.user_id),
    ]);
    const currentFingerprints = new Set(findings.map((finding) => finding.fingerprint));
    const previousFingerprints = new Set((priorActive || []).map((finding) => finding.fingerprint));
    const newFindings = findings.filter((finding) => !previousFingerprints.has(finding.fingerprint));
    const newFindingsCount = newFindings.length;
    const dispositionMap = new Map((dispositions || []).map((item) => [item.fingerprint, item]));

    const resolvedIds = triggerType === "pull_request" ? [] : (priorActive || []).filter((finding) => !currentFingerprints.has(finding.fingerprint)).map((finding) => finding.id);
    const supersededIds = triggerType === "pull_request" ? [] : (priorActive || []).filter((finding) => currentFingerprints.has(finding.fingerprint)).map((finding) => finding.id);
    const { error: resolutionError } = resolvedIds.length
      ? await supabase.from("pallos_code_findings").update({ status: "resolved", resolved_at: new Date().toISOString(), resolved_by_scan_id: scan.id, resolution_reason: "Verified absent in a later repository scan." }).in("id", resolvedIds).eq("user_id", repository.user_id)
      : { error: null };
    if (resolutionError) throw resolutionError;
    if (supersededIds.length) {
      const { error: supersedeError } = await supabase.from("pallos_code_findings").update({ status: "superseded", resolution_reason: "Replaced by the latest scan occurrence." }).in("id", supersededIds).eq("user_id", repository.user_id);
      if (supersedeError) throw supersedeError;
    }
    const findingsToSave = triggerType === "pull_request" ? newFindings : findings;
    if (findingsToSave.length > 0) {
      const { error: findingsError } = await supabase.from("pallos_code_findings").insert(findingsToSave.map((finding) => {
        const disposition = dispositionMap.get(finding.fingerprint);
        const stillApplies = disposition?.source_hash === finding.source_hash;
        return { ...finding, user_id: repository.user_id, repository_id: repository.id, scan_id: scan.id, status: triggerType === "pull_request" ? "pr_review" : stillApplies ? disposition.disposition : "open", resolution_reason: stillApplies ? disposition.reason : null };
      }));
      if (findingsError) throw findingsError;
    }

    const finishedAt = new Date().toISOString();
    const completed = { ...scan, status: "completed", commit_sha: commit.sha, files_scanned: files.length, findings_count: findings.length, new_findings_count: newFindingsCount, assessment, finished_at: finishedAt };
    const [{ error: completionError }, { error: repositoryError }] = await Promise.all([
      supabase.from("pallos_code_scans").update({ status: "completed", commit_sha: commit.sha, files_scanned: files.length, findings_count: findings.length, new_findings_count: newFindingsCount, assessment, finished_at: finishedAt }).eq("id", scan.id).eq("user_id", repository.user_id),
      triggerType === "pull_request" ? Promise.resolve({ error: null }) : supabase.from("pallos_github_repositories").update({ last_scanned_at: finishedAt, updated_at: finishedAt }).eq("id", repository.id).eq("user_id", repository.user_id),
    ]);
    if (completionError || repositoryError) throw completionError || repositoryError;
    return { scan: completed, findings, newFindings, treeTruncated: tree.truncated, duplicate: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : "The GitHub scan failed.";
    await supabase.from("pallos_code_scans").update({ status: "failed", error_message: message.slice(0, 500), finished_at: new Date().toISOString() }).eq("id", scan.id).eq("user_id", repository.user_id);
    throw error;
  }
}
