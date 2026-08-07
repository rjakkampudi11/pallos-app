"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowClockwise, ArrowRight, CheckCircle, GitBranch, Pulse, WarningCircle } from "@phosphor-icons/react";

type Scan = {
  id: string;
  status: "running" | "completed" | "failed";
  trigger_type: "manual" | "push";
  branch_ref: string | null;
  commit_sha: string | null;
  files_scanned: number;
  findings_count: number;
  error_message: string | null;
  started_at: string;
  finished_at: string | null;
  repository: { id: string; full_name: string; default_branch: string } | null;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatDuration(scan: Scan) {
  if (!scan.finished_at) return scan.status === "running" ? "Running" : "—";
  const seconds = Math.max(0, Math.round((new Date(scan.finished_at).getTime() - new Date(scan.started_at).getTime()) / 1000));
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

export function GitHubScanHistory({ mode, notify, openConnections }: { mode: "runs" | "activity"; notify: (message: string) => void; openConnections: () => void }) {
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/github/scans", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load scan history.");
      setScans(data.scans || []);
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load scan history.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const totals = useMemo(() => ({
    completed: scans.filter((scan) => scan.status === "completed").length,
    automatic: scans.filter((scan) => scan.trigger_type === "push").length,
    findings: scans.reduce((sum, scan) => sum + scan.findings_count, 0),
  }), [scans]);

  function exportActivity() {
    const rows = [
      ["Repository", "Trigger", "Status", "Commit", "Files", "Findings", "Started", "Finished", "Error"],
      ...scans.map((scan) => [scan.repository?.full_name || "Deleted repository", scan.trigger_type, scan.status, scan.commit_sha || "", scan.files_scanned, scan.findings_count, scan.started_at, scan.finished_at || "", scan.error_message || ""]),
    ];
    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "pallos-github-scan-history.csv";
    link.click();
    URL.revokeObjectURL(url);
    notify("Live GitHub scan history exported.");
  }

  if (loading) return <div className="workspace-card github-history-state"><ArrowClockwise className="spin" /><strong>Loading live scan history…</strong></div>;
  if (error) return <div className="workspace-card github-history-state error"><WarningCircle /><strong>{error}</strong><button onClick={() => void load()}>Try again</button></div>;
  if (scans.length === 0) return <div className="workspace-card github-history-state"><GitBranch /><strong>No GitHub scans yet.</strong><p>Connect a repository and run its first scan. Future pushes to its default branch will appear here automatically.</p><button className="run-button" onClick={openConnections}>Connect GitHub<ArrowRight /></button></div>;

  if (mode === "activity") {
    return <div className="workspace-card activity-card"><div className="card-head"><div><span>LIVE WORKSPACE HISTORY</span><h2>GitHub scan activity</h2></div><button onClick={exportActivity}>Export CSV</button></div><div className="activity-list">{scans.map((scan, index) => <div key={scan.id}><span>{scan.status === "failed" ? <WarningCircle /> : scan.status === "running" ? <Pulse /> : <CheckCircle />}</span><div><strong>{scan.status === "running" ? "Scan started" : scan.status === "failed" ? "Scan failed" : "Scan completed"} · {scan.repository?.full_name || "Deleted repository"}</strong><p>{scan.trigger_type === "push" ? "Automatic push" : "Manual run"} · {scan.files_scanned} files · {scan.findings_count} findings · {formatDate(scan.started_at)}{scan.commit_sha ? ` · ${scan.commit_sha.slice(0, 7)}` : ""}</p>{scan.error_message ? <small>{scan.error_message}</small> : null}</div><em>{index === 0 ? "Latest" : ""}</em></div>)}</div></div>;
  }

  return <div className="github-history-layout"><div className="github-history-summary"><article><span>COMPLETED</span><strong>{totals.completed}</strong><small>saved GitHub scans</small></article><article><span>AUTOMATIC</span><strong>{totals.automatic}</strong><small>triggered by a push</small></article><article><span>FINDINGS</span><strong>{totals.findings}</strong><small>across saved runs</small></article></div><div className="workspace-card runs-card"><div className="card-head"><div><span>LIVE SCAN HISTORY</span><h2>Recent GitHub agent runs</h2></div><button onClick={() => void load()}><ArrowClockwise />Refresh</button></div><div className="runs-table github-runs-table"><div className="table-head"><span>Repository</span><span>Started</span><span>Trigger</span><span>Status</span><span>Result</span><span>Commit</span></div>{scans.map((scan) => <button className="table-row" key={scan.id} onClick={() => notify(`${scan.repository?.full_name || "Repository"}: ${scan.status}, ${scan.files_scanned} files, ${scan.findings_count} findings.`)}><span><GitBranch />{scan.repository?.full_name || "Deleted repository"}</span><span>{formatDate(scan.started_at)}</span><span><i className={`trigger-badge ${scan.trigger_type}`} />{scan.trigger_type === "push" ? "Automatic" : "Manual"}</span><span><i className={`status-light ${scan.status === "completed" ? "" : "stopped"}`} />{scan.status}</span><span>{scan.findings_count} findings · {formatDuration(scan)}</span><span>{scan.commit_sha?.slice(0, 7) || "Pending"}</span></button>)}</div></div></div>;
}
