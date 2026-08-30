import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { sendIncidentEmail } from "@/lib/incident-email";
import { compareResponse, describeSchema, fetchEndpoint, type SchemaDescription } from "@/lib/monitoring";
import { decryptHeaders } from "@/lib/monitor-secrets";
import { nextScheduledAt, type ScheduleFrequency } from "@/lib/scheduling";
import { assessEndpoint } from "@/lib/security-assessment";

export type MonitorRecord = {
  id: string;
  user_id: string;
  name: string;
  url: string;
  baseline_schema: SchemaDescription;
  headers_encrypted: string | null;
  has_auth_headers: boolean;
  schedule_frequency: ScheduleFrequency;
  next_check_at: string | null;
  email_alerts: boolean;
};

export async function runMonitorCheck(supabase: SupabaseClient, monitor: MonitorRecord, options: { requestedUrl?: string; scheduled?: boolean } = {}) {
  const requestedUrl = options.requestedUrl?.trim() || monitor.url;
  const privateHeaders = decryptHeaders(monitor.headers_encrypted);
  const snapshot = await fetchEndpoint(requestedUrl, privateHeaders);
  const changes = compareResponse(monitor.baseline_schema, snapshot);
  const assessment = assessEndpoint(snapshot, changes);
  const serious = changes.some((change) => change.serious);
  const outcome = !snapshot.ok ? "error" : changes.length ? "changed" : "healthy";

  const { data: check, error: checkError } = await supabase.from("pallos_checks").insert({
    user_id: monitor.user_id,
    monitor_id: monitor.id,
    requested_url: requestedUrl,
    status_code: snapshot.statusCode,
    response_schema: snapshot.body === null ? null : describeSchema(snapshot.body),
    response_ms: snapshot.durationMs,
    outcome,
    serious,
    changes,
    error_message: snapshot.errorMessage,
    assessment,
  }).select().single();
  if (checkError || !check) throw new Error(checkError?.message || "Could not save the check.");

  const monitorUpdates: Record<string, unknown> = {
    last_status_code: snapshot.statusCode,
    last_result: outcome,
    last_checked_at: check.checked_at,
    updated_at: new Date().toISOString(),
  };
  if (options.scheduled) monitorUpdates.next_check_at = nextScheduledAt(monitor.schedule_frequency);
  const { error: monitorUpdateError } = await supabase.from("pallos_monitors").update(monitorUpdates).eq("id", monitor.id).eq("user_id", monitor.user_id);
  if (monitorUpdateError) throw new Error(monitorUpdateError.message);

  let incident = null;
  let incidentCreated = false;
  let alert: Awaited<ReturnType<typeof sendIncidentEmail>> = { status: "skipped" };
  if (serious) {
    const { data: openIncident, error: openError } = await supabase.from("pallos_incidents").select("*").eq("monitor_id", monitor.id).eq("user_id", monitor.user_id).eq("status", "open").order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (openError) throw new Error(openError.message);
    incident = openIncident;
    if (!incident) {
      const critical = changes.some((change) => change.kind === "http_error");
      const inserted = await supabase.from("pallos_incidents").insert({
        user_id: monitor.user_id,
        monitor_id: monitor.id,
        check_id: check.id,
        title: critical ? `${monitor.name} endpoint failed` : `${monitor.name} response contract changed`,
        severity: critical ? "critical" : "high",
        summary: changes.map((change) => `${change.kind.replaceAll("_", " ")}: ${change.path}`).join("; "),
        changes,
      }).select().single();
      if (inserted.error || !inserted.data) throw new Error(inserted.error?.message || "Could not create the incident.");
      incident = inserted.data;
      incidentCreated = true;
    }
    alert = await sendIncidentEmail(supabase, monitor, incident);
  }

  return { check, incident, incidentCreated, alert, outcome, changes, snapshot, assessment };
}
