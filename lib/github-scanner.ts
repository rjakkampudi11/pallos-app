import "server-only";

import { scanRepositoryFiles, type ScanFile } from "@/lib/code-scanner";
import { githubFetch, installationToken } from "@/lib/github-app";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type TreeEntry = { path: string; type: "blob" | "tree"; sha: string; size?: number };
type TreeResponse = { sha: string; tree: TreeEntry[]; truncated: boolean };
type BlobResponse = { content: string; encoding: string; size: number };
type CommitResponse = { sha: string; commit: { tree: { sha: string } } };

export type GitHubRepositoryRecord = {
  id: string;
  user_id: string;
  installation_id: number | string;
  owner_login: string;
  name: string;
  default_branch: string;
};

type RunOptions = {
  repository: GitHubRepositoryRecord;
  triggerType?: "manual" | "push";
  commitRef?: string;
  branchRef?: string;
  deliveryId?: string;
};

const allowedExtensions = /\.(?:[cm]?[jt]sx?|py|rb|go|java|cs|php|rs|swift|kt|sql|env|ya?ml|json|toml)$/i;
const allowedNames = /(?:^|\/)(?:Dockerfile|Procfile|\.env\.example|\.gitignore)$/i;
const ignoredPaths = /(?:^|\/)(?:node_modules|vendor|dist|build|\.next|coverage|public\/assets)(?:\/|$)/i;
const ignoredFiles = /(?:^|\/)(?:package-lock\.json|npm-shrinkwrap\.json|composer\.lock|Cargo\.lock|bun\.lockb?|yarn\.lock|pnpm-lock\.ya?ml)$/i;

function eligible(entry: TreeEntry) {
  return entry.type === "blob" && !ignoredPaths.test(entry.path) && !ignoredFiles.test(entry.path) && (allowedExtensions.test(entry.path) || allowedNames.test(entry.path)) && (entry.size ?? 0) <= 300_000;
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

export async function runGitHubRepositoryScan({ repository, triggerType = "manual", commitRef, branchRef, deliveryId }: RunOptions) {
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
    const findings = scanRepositoryFiles(files);

    const { error: resolutionError } = await supabase.from("pallos_code_findings").update({ status: "resolved" }).eq("repository_id", repository.id).eq("user_id", repository.user_id).eq("status", "open");
    if (resolutionError) throw resolutionError;
    if (findings.length > 0) {
      const { error: findingsError } = await supabase.from("pallos_code_findings").insert(findings.map((finding) => ({ ...finding, user_id: repository.user_id, repository_id: repository.id, scan_id: scan.id })));
      if (findingsError) throw findingsError;
    }

    const finishedAt = new Date().toISOString();
    const completed = { ...scan, status: "completed", commit_sha: commit.sha, files_scanned: files.length, findings_count: findings.length, finished_at: finishedAt };
    const [{ error: completionError }, { error: repositoryError }] = await Promise.all([
      supabase.from("pallos_code_scans").update({ status: "completed", commit_sha: commit.sha, files_scanned: files.length, findings_count: findings.length, finished_at: finishedAt }).eq("id", scan.id).eq("user_id", repository.user_id),
      supabase.from("pallos_github_repositories").update({ last_scanned_at: finishedAt, updated_at: finishedAt }).eq("id", repository.id).eq("user_id", repository.user_id),
    ]);
    if (completionError || repositoryError) throw completionError || repositoryError;
    return { scan: completed, findings, treeTruncated: tree.truncated, duplicate: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : "The GitHub scan failed.";
    await supabase.from("pallos_code_scans").update({ status: "failed", error_message: message.slice(0, 500), finished_at: new Date().toISOString() }).eq("id", scan.id).eq("user_id", repository.user_id);
    throw error;
  }
}
