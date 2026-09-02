"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowClockwise, ArrowRight, CheckCircle, GitBranch, LockKey, Play, WarningCircle } from "@phosphor-icons/react";
import { SecurityAssessmentPanel } from "@/app/components/security-assessment-panel";
import type { SecurityAssessment } from "@/lib/security-assessment";

type FindingStatus = "open" | "false_positive" | "accepted_risk" | "intended_behavior" | "resolved";
type Finding = { id?: string; fingerprint: string; title: string; severity: "critical" | "high" | "review" | "low"; category: string; file_path: string; line_number: number | null; evidence: string; explanation: string; suggested_fix: string; status: FindingStatus; resolution_reason?: string | null; resolved_at?: string | null };
type Scan = { id: string; status: "running" | "completed" | "failed"; files_scanned: number; findings_count: number; assessment: SecurityAssessment | null; started_at: string; finished_at: string | null; error_message: string | null };
type Repository = { id: string; full_name: string; default_branch: string; is_private: boolean; last_scanned_at: string | null; latest_scan: Scan | null; findings: Finding[]; verified_fixes: Finding[] };

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
    if (result === "connected-webhook-warning") notify?.("GitHub connected. Approve the Webhooks permission in GitHub, then refresh access to enable automatic push scans.");
    if (result === "install-required") notify?.("Install Pallos on at least one repository, then connect GitHub again.");
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
      notify?.(`Scan complete: ${data.scan.files_scanned} ${data.scan.files_scanned === 1 ? "file" : "files"} checked, ${data.scan.findings_count} ${data.scan.findings_count === 1 ? "finding" : "findings"}, security score ${data.scan.assessment?.score ?? "pending"}.`);
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
    notify?.(data.providerCleanupFailed ? "Pallos data was removed. GitHub could not confirm every webhook removal, so revoke the Pallos installation in GitHub too." : "GitHub disconnected. Pallos webhooks and stored repository scan data were removed.");
  }

  const allFindings = useMemo(() => repositories.flatMap((repository) => repository.findings.map((finding) => ({ ...finding, repository: repository.full_name }))), [repositories]);
  const verifiedFixes = useMemo(() => repositories.flatMap((repository) => (repository.verified_fixes || []).map((finding) => ({ ...finding, repository: repository.full_name }))), [repositories]);

  if (loading) return <section className="workspace-card github-loading"><ArrowClockwise className="spin" /><strong>Loading GitHub connection…</strong></section>;
  if (error && error.includes("migration")) return <section className="workspace-card github-empty"><WarningCircle /><h2>One database step is required</h2><p>{error}</p><code>supabase/migrations/20260806220000_add_github_scanner.sql</code></section>;

  if (repositories.length === 0) return <section className="workspace-card github-empty"><GitBranch /><span>READ-ONLY CODE ACCESS</span><h2>{configured ? "Connect your first repository." : "GitHub App setup is required."}</h2><p>{configured ? "Pallos reads only the repositories you choose and adds signed push and pull-request webhooks. It cannot push commits, change files, or merge code." : "Create the Pallos GitHub App, then add its server environment variables to Vercel."}</p>{error && <div className="github-error">{error}</div>}<div className="github-empty-actions">{configured && <a className="run-button" href="/api/github/connect"><GitBranch />Connect GitHub</a>}{appSlug && <a className="outline-action" href={`https://github.com/apps/${appSlug}/installations/new`} target="_blank" rel="noopener noreferrer">Choose repositories <ArrowRight /></a>}</div><div className="github-trust"><LockKey /><div><strong>Minimum access</strong><small>Contents: read-only · Metadata: read-only · Issues: PR summary comments only · Webhooks: push and pull-request events · No permanent access token stored</small></div></div></section>;

  if (mode === "findings") return <section className="github-live-section"><div className="github-section-head"><div><span>LIVE GITHUB FINDINGS</span><h2>{allFindings.length ? `${allFindings.length} ${allFindings.length === 1 ? "finding" : "findings"} from connected code` : "No open code findings"}</h2></div><a href="/projects">Scan repositories <ArrowRight /></a></div><div className="repository-assessments">{repositories.filter((repository) => repository.latest_scan?.status === "completed").map((repository) => <div className="workspace-card" key={repository.id}><small>{repository.full_name}</small><SecurityAssessmentPanel assessment={repository.latest_scan?.assessment} /></div>)}</div>{allFindings.length === 0 ? <div className="workspace-card github-clean"><CheckCircle weight="fill" /><strong>No critical vulnerabilities were verified.</strong><p>Review the passed and untested checks above; a clean deterministic scan is not proof that every security property was tested.</p></div> : <div className="github-finding-grid">{allFindings.map((finding) => <article className="workspace-card github-finding" key={`${finding.repository}-${finding.fingerprint}`}><div><span className={`detail-severity ${finding.severity}`}>{finding.severity}</span><small>{finding.repository}</small></div><h3>{finding.title}</h3><code>{finding.file_path}{finding.line_number ? `:${finding.line_number}` : ""}</code><p>{finding.evidence}</p><details><summary>Why it matters and how to fix it</summary><p>{finding.explanation}</p><strong>{finding.suggested_fix}</strong></details>{finding.id ? <FindingReview finding={finding} onUpdated={load} notify={notify} /> : null}</article>)}</div>}{verifiedFixes.length ? <div className="workspace-card verified-fixes"><div className="card-head"><div><span>VERIFIED REMEDIATION</span><h2>Findings absent after a later scan</h2></div></div>{verifiedFixes.slice(0, 10).map((finding) => <div className="verified-fix-row" key={`${finding.repository}-${finding.id}`}><CheckCircle weight="fill" /><div><strong>{finding.title}</strong><small>{finding.repository} · {finding.file_path}</small></div><em>{finding.resolved_at ? new Date(finding.resolved_at).toLocaleDateString() : "Verified"}</em></div>)}</div> : null}</section>;

  return <section className="github-live-section"><div className="github-section-head"><div><span>{mode === "connections" ? "LIVE CONNECTION" : "CONNECTED REPOSITORIES"}</span><h2>{repositories.length} GitHub {repositories.length === 1 ? "repository" : "repositories"}</h2></div>{mode === "connections" && <button className="danger-link" onClick={disconnect}>Disconnect and delete data</button>}</div>{error && <div className="github-error">{error}</div>}<div className="github-repository-grid">{repositories.map((repository) => <article className="workspace-card github-repository" key={repository.id}><div className="github-repo-top"><span><GitBranch /></span><div><h3>{repository.full_name}</h3><small>{repository.is_private ? "Private" : "Public"} · {repository.default_branch}</small></div><em>{repository.latest_scan?.status || "Not scanned"}</em></div><div className="github-repo-stats"><div><span>Files checked</span><strong>{repository.latest_scan?.files_scanned ?? "—"}</strong></div><div><span>Open findings</span><strong>{repository.findings.length}</strong></div><div><span>Last scan</span><strong>{repository.last_scanned_at ? new Date(repository.last_scanned_at).toLocaleDateString() : "Never"}</strong></div></div>{repository.latest_scan?.status === "completed" ? <SecurityAssessmentPanel assessment={repository.latest_scan.assessment} compact /> : null}<button className="run-button" onClick={() => scan(repository)} disabled={scanning === repository.id}>{scanning === repository.id ? <ArrowClockwise className="spin" /> : <Play weight="fill" />}{scanning === repository.id ? "Scanning…" : "Scan read-only"}</button></article>)}</div>{mode === "connections" && <div className="github-permissions"><LockKey /><div><strong>What Pallos can access</strong><p>Read-only file contents and metadata for repositories selected in GitHub, plus the ability to manage its signed push webhook for automatic scans. Pallos cannot modify, push, or merge code.</p></div><a href="/api/github/connect">Refresh access</a></div>}</section>;
}

function FindingReview({ finding, onUpdated, notify }: { finding: Finding; onUpdated: () => Promise<void>; notify?: (message: string) => void }) {
  const [decision, setDecision] = useState<FindingStatus>(finding.status || "open");
  const [reason, setReason] = useState(finding.resolution_reason || "");
  const [saving, setSaving] = useState(false);
  async function save() {
    if (!finding.id) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/github/findings/${finding.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ disposition: decision, reason }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save the review decision.");
      notify?.("Finding review saved. It will reopen automatically if the file changes.");
      await onUpdated();
    } catch (error) { notify?.(error instanceof Error ? error.message : "Could not save the review decision."); }
    finally { setSaving(false); }
  }
  return <div className="finding-review"><label>Status<select value={decision} onChange={(event) => setDecision(event.target.value as FindingStatus)}><option value="open">Open</option><option value="false_positive">Incorrect finding</option><option value="accepted_risk">Accepted risk</option><option value="intended_behavior">Intended behavior</option></select></label>{decision !== "open" ? <label>Required reason<input value={reason} onChange={(event) => setReason(event.target.value)} minLength={4} maxLength={500} placeholder="Why is this decision appropriate?" /></label> : null}<button onClick={save} disabled={saving || (decision !== "open" && reason.trim().length < 4)}>{saving ? "Saving…" : "Save review"}</button></div>;
}
