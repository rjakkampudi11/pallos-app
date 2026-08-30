"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { ArrowSquareOut, ClockCounterClockwise, ShieldCheck, Trash } from "@phosphor-icons/react";

type AuditEvent = { id: string; action: string; resource_type: string; metadata: Record<string, unknown>; created_at: string };

const labels: Record<string, string> = {
  "auth.login": "Logged in",
  "auth.email_verified": "Email verified",
  "github.connected": "GitHub connected",
  "github.disconnected": "GitHub disconnected",
  "repository.scanned": "Repository scanned",
  "monitor.created": "Monitor created",
  "monitor.updated": "Monitor changed",
  "monitor.checked": "Monitor checked",
  "monitor.deleted": "Monitor deleted",
};

export function SecuritySettings({ notify }: { notify: (message: string) => void }) {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [auditError, setAuditError] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch("/api/audit", { cache: "no-store" }).then(async (response) => {
      const data = await response.json();
      if (!active) return;
      if (!response.ok) setAuditError(data.error || "Could not load security history.");
      else setEvents(data.events || []);
    }).catch(() => active && setAuditError("Could not load security history."));
    return () => { active = false; };
  }, []);

  async function deleteAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (!window.confirm("Permanently delete this account, its monitors, incidents, repository data, and scan history? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const response = await fetch("/api/account/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: form.get("password"), confirmation: form.get("confirmation") }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not delete the account.");
      window.location.assign("https://pallosagent.info?account=deleted");
    } catch (error) { notify(error instanceof Error ? error.message : "Could not delete the account."); }
    finally { setDeleting(false); }
  }

  return <div className="settings-grid security-settings-grid">
    <section className="workspace-card settings-card"><div className="card-head"><div><span>PROTECTION</span><h2>Security controls</h2></div><ShieldCheck /></div><div className="security-control-list"><div><strong>Verified email</strong><span>New accounts must confirm their inbox before accessing a workspace.</span></div><div><strong>Abuse limits</strong><span>Login, signup, monitor checks, and repository scans have server-enforced limits.</span></div><div><strong>Private storage</strong><span>Account rows use ownership policies; monitor headers are encrypted before storage.</span></div></div><Link className="outline-action settings-action" href="https://pallosagent.info/security" target="_blank">Read the public security page <ArrowSquareOut /></Link></section>
    <section className="workspace-card settings-card"><div className="card-head"><div><span>SECURITY HISTORY</span><h2>Recent account activity</h2></div><ClockCounterClockwise /></div>{auditError ? <p className="settings-help">{auditError}</p> : events.length === 0 ? <p className="settings-help">New login, connection, scan, monitor, and deletion events will appear here.</p> : <div className="audit-list">{events.slice(0, 12).map((event) => <div key={event.id}><span /><div><strong>{labels[event.action] || event.action}</strong><small>{event.resource_type} · {new Date(event.created_at).toLocaleString()}</small></div></div>)}</div>}</section>
    <form className="workspace-card settings-card account-delete-card" onSubmit={deleteAccount}><div className="card-head"><div><span>DANGER ZONE</span><h2>Delete account and data</h2></div><Trash /></div><p>This permanently removes your Pallos account, monitors, incidents, connected repository records, and scan history. It cannot be undone.</p><label>Current password<input name="password" type="password" autoComplete="current-password" required /></label><label>Type DELETE to confirm<input name="confirmation" pattern="DELETE" placeholder="DELETE" required /></label><button className="danger-action" disabled={deleting}>{deleting ? "Deleting…" : "Permanently delete account"}</button></form>
  </div>;
}
