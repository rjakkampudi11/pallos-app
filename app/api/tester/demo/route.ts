import { NextResponse } from "next/server";
import { getRequestAuth, unauthorized, withRefreshedSession } from "@/lib/auth";
import { describeSchema, fetchEndpoint } from "@/lib/monitoring";
import { runMonitorCheck, type MonitorRecord } from "@/lib/run-monitor-check";
import { enforceRateLimit, recordAuditEvent } from "@/lib/security-controls";
import { getSupabaseAdmin, SUPABASE_SETUP_MESSAGE } from "@/lib/supabase-admin";
import { assessEndpoint } from "@/lib/security-assessment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await getRequestAuth();
  if (!auth) return unauthorized();
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: SUPABASE_SETUP_MESSAGE, setupRequired: true }, { status: 503 });
  const limited = await enforceRateLimit(request, { scope: "tester-demo", identifier: auth.user.id, limit: 8, windowSeconds: 3600 });
  if (limited) return limited;

  const origin = new URL(request.url).origin;
  const healthyUrl = `${origin}/api/training/profile`;
  const brokenUrl = `${healthyUrl}?fault=1`;
  let { data: monitor } = await supabase.from("pallos_monitors").select("*").eq("user_id", auth.user.id).eq("is_demo", true).limit(1).maybeSingle();

  if (!monitor) {
    const snapshot = await fetchEndpoint(healthyUrl);
    if (!snapshot.ok || snapshot.body === null || snapshot.statusCode === null) return NextResponse.json({ error: "The guided demo baseline could not be reached." }, { status: 502 });
    const inserted = await supabase.from("pallos_monitors").insert({
      user_id: auth.user.id, name: "Pallos guided demo", url: healthyUrl, is_demo: true,
      baseline_status: snapshot.statusCode, baseline_body: null, baseline_schema: describeSchema(snapshot.body),
      last_status_code: snapshot.statusCode, last_result: "baseline", last_checked_at: new Date().toISOString(),
      schedule_frequency: "manual", email_alerts: false,
    }).select("*").single();
    if (inserted.error || !inserted.data) return NextResponse.json({ error: inserted.error?.message || "Could not save the guided demo." }, { status: 500 });
    monitor = inserted.data;
    await supabase.from("pallos_checks").insert({ user_id: auth.user.id, monitor_id: monitor.id, requested_url: healthyUrl, status_code: snapshot.statusCode, response_schema: describeSchema(snapshot.body), response_ms: snapshot.durationMs, outcome: "baseline", serious: false, changes: [], assessment: assessEndpoint(snapshot, []) });
  }

  const result = await runMonitorCheck(supabase, monitor as MonitorRecord, { requestedUrl: brokenUrl });
  await recordAuditEvent({ userId: auth.user.id, action: "tester.demo_completed", resourceType: "monitor", resourceId: monitor.id, metadata: { changes: result.changes.length }, request });
  return withRefreshedSession(NextResponse.json({ monitorId: monitor.id, check: result.check, incident: result.incident, changes: result.changes }), auth);
}
