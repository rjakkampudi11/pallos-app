"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowClockwise, ArrowRight, CheckCircle, GitBranch, LockKey, Play, WarningCircle } from "@phosphor-icons/react";

type Finding = { id?: string; fingerprint: string; title: string; severity: "critical" | "high" | "review" | "low"; category: string; file_path: string; line_number: number | null; evidence: string; explanation: string; suggested_fix: string };
type Scan = { id: string; status: "running" | "completed" | "failed"; files_scanned: number; findings_count: number; started_at: string; finished_at: string | null; error_message: string | null };
type Repository = { id: string; full_name: string; default_branch: string; is_private: boolean; last_scanned_at: string | null; latest_scan: Scan | null; findings: Finding[] };

export function GitHubWorkspace({ mode = "connections", notify }: { mode?: "connections" | "projects" | "findings"; notify?: (message: string) => void }) {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [configured, setConfigured] = useState(false);
  const [appSlug, setAppSlug] = useState("");
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/github/repositories", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load GitHub repositories.");
      setRepositories(data.repositories || []);
      setConfigured(Boolean(data.configured));
      setAppSlug(data.appSlug || "");
      setError("");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not load GitHub repositories."); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    const loadTimer = window.setTimeout(() => void load(), 0);
    const result = new URLSearchParams(window.location.search).get("github");
    if (result === "connected") notify?.("GitHub connected. Choose a repository to scan.");
    if (result === "failed" || result === "invalid-state") notify?.("GitHub could not be connected. Please try again.");
    return () => window.clearTimeout(loadTimer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function scan(repository: Repository) {
    setScanning(repository.id);
    setError("");
    notify?.(`Scanning ${repository.full_name} with read-only access…`);
    try {
      const response = await fetch(`/api/github/repositories/${repository.id}/scan`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Scan failed.");
      notify?.(`Scan complete: ${data.scan.files_scanned} ${data.scan.files_scanned === 1 ? "file" : "files"} checked and ${data.scan.findings_count} ${data.scan.findings_count === 1 ? "finding" : "findings"} found.`);
      await load();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Scan failed.";
      setError(message);
      notify?.(message);
    } finally { setScanning(null); }
  }

  async function disconnect() {
    if (!window.confirm("Remove GitHub repositories and their Pallos scan history from this account?")) return;
    const response = await fetch("/api/github/repositories", { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) { setError(data.error || "Could not disconnect GitHub."); return; }
    setRepositories([]);
    notify?.("GitHub data removed from Pallos. Revoke the installation in GitHub to remove provider access too.");
  }

  const allFindings = useMemo(() => repositories.flatMap((repository) => repository.findings.map((finding) => ({ ...finding, repository: repository.full_name }))), [repositories]);

  if (loading) return <section className="workspace-card github-loading"><ArrowClockwise className="spin" /><strong>Loading GitHub connection…</strong></section>;
  if (error && error.includes("migration")) return <section className="workspace-card github-empty"><WarningCircle /><h2>One database step is required</h2><p>{error}</p><code>supabase/migrations/20260806220000_add_github_scanner.sql</code></section>;

  if (repositories.length === 0) return <section className="workspace-card github-empty"><GitBranch /><span>READ-ONLY GITHUB APP</span><h2>{configured ? "Connect your first repository." : "GitHub App setup is required."}</h2><p>{configured ? "Pallos can read only the repositories you choose. It cannot push commits, change files, merge code, or access other repositories." : "Create the Pallos GitHub App, then add its five server environment variables to Vercel."}</p>{error && <div className="github-error">{error}</div>}<div className="github-empty-actions">{configured && <a className="run-button" href="/api/github/connect"><GitBranch />Connect GitHub</a>}{appSlug && <a className="outline-action" href={`https://github.com/apps/${appSlug}/installations/new`} target="_blank" rel="noopener noreferrer">Choose repositories <ArrowRight /></a>}</div><div className="github-trust"><LockKey /><div><strong>Minimum access</strong><small>Repository contents: read-only · Metadata: read-only · No permanent access token stored</small></div></div></section>;

  if (mode === "findings") return <section className="github-live-section"><div className="github-section-head"><div><span>LIVE GITHUB FINDINGS</span><h2>{allFindings.length ? `${allFindings.length} ${allFindings.length === 1 ? "finding" : "findings"} from connected code` : "No open code findings"}</h2></div><a href="/projects">Scan repositories <ArrowRight /></a></div>{allFindings.length === 0 ? <div className="workspace-card github-clean"><CheckCircle weight="fill" /><strong>Your latest scans have no open findings.</strong><p>This does not prove the app has no security issues; it only covers Pallos&apos;s current deterministic checks.</p></div> : <div className="github-finding-grid">{allFindings.map((finding) => <article className="workspace-card github-finding" key={`${finding.repository}-${finding.fingerprint}`}><div><span className={`detail-severity ${finding.severity}`}>{finding.severity}</span><small>{finding.repository}</small></div><h3>{finding.title}</h3><code>{finding.file_path}{finding.line_number ? `:${finding.line_number}` : ""}</code><p>{finding.evidence}</p><details><summary>Why it matters and how to fix it</summary><p>{finding.explanation}</p><strong>{finding.suggested_fix}</strong></details></article>)}</div>}</section>;

  return <section className="github-live-section"><div className="github-section-head"><div><span>{mode === "connections" ? "LIVE CONNECTION" : "CONNECTED REPOSITORIES"}</span><h2>{repositories.length} GitHub {repositories.length === 1 ? "repository" : "repositories"}</h2></div>{mode === "connections" && <button className="danger-link" onClick={disconnect}>Remove Pallos data</button>}</div>{error && <div className="github-error">{error}</div>}<div className="github-repository-grid">{repositories.map((repository) => <article className="workspace-card github-repository" key={repository.id}><div className="github-repo-top"><span><GitBranch /></span><div><h3>{repository.full_name}</h3><small>{repository.is_private ? "Private" : "Public"} · {repository.default_branch}</small></div><em>{repository.latest_scan?.status || "Not scanned"}</em></div><div className="github-repo-stats"><div><span>Files checked</span><strong>{repository.latest_scan?.files_scanned ?? "—"}</strong></div><div><span>Open findings</span><strong>{repository.findings.length}</strong></div><div><span>Last scan</span><strong>{repository.last_scanned_at ? new Date(repository.last_scanned_at).toLocaleDateString() : "Never"}</strong></div></div><button className="run-button" onClick={() => scan(repository)} disabled={scanning === repository.id}>{scanning === repository.id ? <ArrowClockwise className="spin" /> : <Play weight="fill" />}{scanning === repository.id ? "Scanning…" : "Scan read-only"}</button></article>)}</div>{mode === "connections" && <div className="github-permissions"><LockKey /><div><strong>What Pallos can access</strong><p>Only file contents and basic metadata for repositories selected in GitHub. Pallos cannot write, push, merge, or change settings.</p></div><a href="/api/github/connect">Refresh access</a></div>}</section>;
}
