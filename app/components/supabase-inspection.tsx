"use client";

import { FormEvent, useEffect, useState } from "react";
import { ArrowClockwise, CheckCircle, Database, LockKey, WarningCircle } from "@phosphor-icons/react";

type Finding = { id: string; severity: "critical" | "high" | "review"; title: string; evidence: string; remediation: string };
type Result = { checkedAt: string; tablesChecked: number; policiesChecked?: number; bucketsChecked?: number; privilegedFunctionsChecked?: number; findings: Finding[] };
type Connection = { id: string; project_ref: string; project_name: string; last_result: Result | null };

export function SupabaseInspection({ notify }: { notify?: (message: string) => void }) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/supabase/inspection", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load Supabase inspections.");
      setConnections(data.connections || []); setError("");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not load Supabase inspections."); }
    finally { setLoading(false); }
  }

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, []);

  async function inspect(body: Record<string, string>) {
    setRunning(true); setError("");
    try {
      const response = await fetch("/api/supabase/inspection", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Supabase inspection failed.");
      notify?.(`Supabase inspection complete: ${data.result.tablesChecked} tables checked and ${data.result.findings.length} findings.`);
      await load();
      return true;
    } catch (caught) { const message = caught instanceof Error ? caught.message : "Supabase inspection failed."; setError(message); notify?.(message); return false; }
    finally { setRunning(false); }
  }

  async function connect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const succeeded = await inspect({ projectRef: String(form.get("projectRef") || ""), projectName: String(form.get("projectName") || ""), managementToken: String(form.get("managementToken") || "") });
    if (succeeded) formElement.reset();
  }

  return <section className="github-live-section supabase-live-section"><div className="github-section-head"><div><span>LIVE SUPABASE INSPECTION</span><h2>Database access controls</h2></div></div><div className="workspace-card supabase-connect"><div><Database /><h3>Inspect the live database catalog</h3><p>Pallos runs read-only catalog queries through the Supabase Management API. The token is encrypted at rest and never shown again.</p></div><form onSubmit={connect}><label>Project name<input name="projectName" required maxLength={100} placeholder="My production app" /></label><label>Project reference<input name="projectRef" required pattern="[A-Za-z0-9]{8,40}" placeholder="abcdefghijklmnopqrst" /></label><label>Management token<input name="managementToken" required type="password" autoComplete="off" placeholder="sbp_…" /></label><button className="run-button" disabled={running}>{running ? <ArrowClockwise className="spin" /> : <LockKey />}{running ? "Inspecting…" : "Connect and inspect"}</button></form>{error ? <div className="github-error">{error}</div> : null}</div>{loading ? <div className="workspace-card github-loading"><ArrowClockwise className="spin" />Loading inspections…</div> : connections.map((connection) => <article className="workspace-card supabase-result" key={connection.id}><div className="card-head"><div><span>{connection.project_ref}</span><h2>{connection.project_name}</h2></div><button className="outline-action" disabled={running} onClick={() => inspect({ connectionId: connection.id })}>Run again</button></div><div className="supabase-result-summary"><strong>{connection.last_result?.tablesChecked || 0}</strong><span>tables checked</span><strong>{connection.last_result?.findings.length || 0}</strong><span>findings</span></div>{connection.last_result?.findings.length ? connection.last_result.findings.map((finding) => <details className="assessment-check failed" key={finding.id}><summary><WarningCircle /><span><strong>{finding.title}</strong><small>{finding.severity}</small></span></summary><div><p><b>Evidence:</b> {finding.evidence}</p><p><b>How to fix:</b> {finding.remediation}</p></div></details>) : <div className="github-clean"><CheckCircle weight="fill" /><strong>No catalog risks were verified.</strong><p>This does not test application behavior or prove every policy is correct.</p></div>}</article>)}</section>;
}
