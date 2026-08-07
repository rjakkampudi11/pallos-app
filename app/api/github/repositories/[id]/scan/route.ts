import { NextResponse } from "next/server";
import { getRequestAuth, unauthorized, withRefreshedSession } from "@/lib/auth";
import { scanRepositoryFiles, type ScanFile } from "@/lib/code-scanner";
import { githubFetch, installationToken } from "@/lib/github-app";
import { getSupabaseAdmin, SUPABASE_SETUP_MESSAGE } from "@/lib/supabase-admin";

type TreeEntry = { path: string; type: "blob" | "tree"; sha: string; size?: number };
type TreeResponse = { sha: string; tree: TreeEntry[]; truncated: boolean };
type BlobResponse = { content: string; encoding: string; size: number };

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

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getRequestAuth();
  if (!auth) return unauthorized();
  const supabase = getSupabaseAdmin();
  if (!supabase) return withRefreshedSession(NextResponse.json({ error: SUPABASE_SETUP_MESSAGE }, { status: 503 }), auth);
  const { id } = await params;
  const { data: repository, error: repositoryError } = await supabase.from("pallos_github_repositories").select("*").eq("id", id).eq("user_id", auth.user.id).maybeSingle();
  if (repositoryError) return withRefreshedSession(NextResponse.json({ error: repositoryError.message }, { status: 500 }), auth);
  if (!repository) return withRefreshedSession(NextResponse.json({ error: "Repository not found." }, { status: 404 }), auth);

  const { data: scan, error: scanError } = await supabase.from("pallos_code_scans").insert({ user_id: auth.user.id, repository_id: id, status: "running" }).select("*").single();
  if (scanError || !scan) return withRefreshedSession(NextResponse.json({ error: scanError?.message || "Could not start scan." }, { status: 500 }), auth);

  try {
    const token = await installationToken(Number(repository.installation_id));
    const owner = repository.owner_login as string;
    const name = repository.name as string;
    const branch = repository.default_branch as string;
    const tree = await githubFetch<TreeResponse>(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/git/trees/${encodeURIComponent(branch)}?recursive=1`, token);
    const entries = tree.tree.filter(eligible).slice(0, 300);
    const files = await loadFiles(token, owner, name, entries);
    const findings = scanRepositoryFiles(files);
    await supabase.from("pallos_code_findings").update({ status: "resolved" }).eq("repository_id", id).eq("user_id", auth.user.id).eq("status", "open");
    if (findings.length > 0) {
      const { error: findingsError } = await supabase.from("pallos_code_findings").insert(findings.map((finding) => ({ ...finding, user_id: auth.user.id, repository_id: id, scan_id: scan.id })));
      if (findingsError) throw findingsError;
    }
    const finishedAt = new Date().toISOString();
    await Promise.all([
      supabase.from("pallos_code_scans").update({ status: "completed", commit_sha: tree.sha, files_scanned: files.length, findings_count: findings.length, finished_at: finishedAt }).eq("id", scan.id).eq("user_id", auth.user.id),
      supabase.from("pallos_github_repositories").update({ last_scanned_at: finishedAt, updated_at: finishedAt }).eq("id", id).eq("user_id", auth.user.id),
    ]);
    return withRefreshedSession(NextResponse.json({ scan: { ...scan, status: "completed", commit_sha: tree.sha, files_scanned: files.length, findings_count: findings.length, finished_at: finishedAt }, findings, treeTruncated: tree.truncated }), auth);
  } catch (error) {
    const message = error instanceof Error ? error.message : "The GitHub scan failed.";
    await supabase.from("pallos_code_scans").update({ status: "failed", error_message: message.slice(0, 500), finished_at: new Date().toISOString() }).eq("id", scan.id).eq("user_id", auth.user.id);
    return withRefreshedSession(NextResponse.json({ error: message }, { status: 502 }), auth);
  }
}

export const maxDuration = 60;
