import "server-only";

import { scanRepositoryFiles, type ScanFile } from "@/lib/code-scanner";
import { assessCodeScan } from "@/lib/security-assessment";
import type { PublicRepositoryTarget } from "@/lib/public-repository-url";

type RepositoryResponse = { private: boolean; default_branch: string; full_name: string; html_url: string };
type CommitResponse = { sha: string; commit: { tree: { sha: string } } };
type TreeEntry = { path: string; type: "blob" | "tree"; sha: string; size?: number };
type TreeResponse = { tree: TreeEntry[]; truncated: boolean };

const githubApi = "https://api.github.com";
const allowedExtensions = /\.(?:[cm]?[jt]sx?|py|rb|go|java|cs|php|rs|swift|kt|sql|env|ya?ml|json|toml)$/i;
const allowedNames = /(?:^|\/)(?:Dockerfile|Procfile|\.env\.example|\.gitignore)$/i;
const ignoredPaths = /(?:^|\/)(?:node_modules|vendor|dist|build|\.next|coverage|public\/assets)(?:\/|$)/i;
const ignoredFiles = /(?:^|\/)(?:npm-shrinkwrap\.json|composer\.lock|Cargo\.lock|bun\.lockb?|yarn\.lock|pnpm-lock\.ya?ml)$/i;
const maxFiles = 120;
const maxBytes = 2_500_000;

function apiHeaders() {
  const token = process.env.GITHUB_PUBLIC_TOKEN || process.env.GITHUB_TOKEN;
  return {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "Pallos-Agent-Public-Scanner",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function githubRequest<T>(path: string) {
  const response = await fetch(`${githubApi}${path}`, { headers: apiHeaders(), cache: "no-store", signal: AbortSignal.timeout(12_000) });
  if (!response.ok) {
    if (response.status === 404) throw new Error("That public GitHub repository could not be found.");
    if (response.status === 403 || response.status === 429) throw new Error("GitHub is temporarily limiting public scans. Try again in a few minutes.");
    throw new Error(`GitHub could not load this repository (${response.status}).`);
  }
  return response.json() as Promise<T>;
}

function eligible(entry: TreeEntry) {
  return entry.type === "blob" && !ignoredPaths.test(entry.path) && !ignoredFiles.test(entry.path)
    && (allowedExtensions.test(entry.path) || allowedNames.test(entry.path)) && (entry.size ?? 0) <= 300_000;
}

function filePriority(path: string) {
  if (/(?:^|\/)(?:\.env|supabase\/migrations|app\/api|pages\/api|api|routes?|middleware|auth|admin|webhooks?|server)(?:\/|\.|$)/i.test(path)) return 0;
  if (/(?:security|permission|session|stripe|openai|config|database|supabase)/i.test(path)) return 1;
  return 2;
}

function selectEntries(entries: TreeEntry[]) {
  const sorted = entries.filter(eligible).sort((a, b) => filePriority(a.path) - filePriority(b.path) || a.path.localeCompare(b.path));
  const selected: TreeEntry[] = [];
  let bytes = 0;
  for (const entry of sorted) {
    const size = entry.size ?? 0;
    if (selected.length >= maxFiles || bytes + size > maxBytes) continue;
    selected.push(entry);
    bytes += size;
  }
  return { selected, eligibleCount: sorted.length, selectedBytes: bytes };
}

async function loadFiles(owner: string, name: string, commitSha: string, entries: TreeEntry[]) {
  const files: ScanFile[] = [];
  for (let start = 0; start < entries.length; start += 16) {
    const batch = entries.slice(start, start + 16);
    const loaded = await Promise.all(batch.map(async (entry) => {
      const encodedPath = entry.path.split("/").map(encodeURIComponent).join("/");
      const url = `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/${encodeURIComponent(commitSha)}/${encodedPath}`;
      const response = await fetch(url, { cache: "no-store", redirect: "error", signal: AbortSignal.timeout(10_000) }).catch(() => null);
      if (!response?.ok) return null;
      const content = await response.text();
      return content.length <= 300_000 ? { path: entry.path, content } : null;
    }));
    files.push(...loaded.filter((file): file is ScanFile => Boolean(file)));
  }
  return files;
}

export async function scanPublicRepository(target: PublicRepositoryTarget) {
  const repositoryPath = `/repos/${encodeURIComponent(target.owner)}/${encodeURIComponent(target.name)}`;
  const repository = await githubRequest<RepositoryResponse>(repositoryPath);
  if (repository.private) throw new Error("Only public repositories can be scanned without connecting GitHub.");
  const commit = await githubRequest<CommitResponse>(`${repositoryPath}/commits/${encodeURIComponent(repository.default_branch)}`);
  const tree = await githubRequest<TreeResponse>(`${repositoryPath}/git/trees/${encodeURIComponent(commit.commit.tree.sha)}?recursive=1`);
  const selection = selectEntries(tree.tree);
  if (selection.selected.length === 0) throw new Error("No supported source files were found in this repository.");
  const files = await loadFiles(target.owner, target.name, commit.sha, selection.selected);
  if (files.length === 0) throw new Error("GitHub did not return any readable source files for this scan.");

  const findings = scanRepositoryFiles(files);
  const partial = tree.truncated || selection.eligibleCount > selection.selected.length || files.length < selection.selected.length;
  const assessment = assessCodeScan(files, findings, partial, false);
  const returnedFindings = findings.slice(0, 100);
  return {
    repository: repository.full_name,
    repositoryUrl: repository.html_url,
    branch: repository.default_branch,
    commitSha: commit.sha,
    filesScanned: files.length,
    eligibleFiles: selection.eligibleCount,
    bytesScanned: selection.selectedBytes,
    partial,
    assessment,
    findingsCount: findings.length,
    findingsTruncated: findings.length > returnedFindings.length,
    findingCounts: {
      confirmed: findings.filter((finding) => finding.severity !== "review").length,
      review: findings.filter((finding) => finding.severity === "review").length,
    },
    findings: returnedFindings.map(({ rule_id, title, severity, category, file_path, line_number, evidence, explanation, suggested_fix }) => ({
      ruleId: rule_id, title, severity, category, filePath: file_path, lineNumber: line_number, evidence, explanation, suggestedFix: suggested_fix,
    })),
  };
}
