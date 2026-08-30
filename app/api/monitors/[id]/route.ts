import { NextResponse } from "next/server";
import { getRequestAuth, unauthorized, withRefreshedSession } from "@/lib/auth";
import { describeSchema, fetchEndpoint } from "@/lib/monitoring";
import { isScheduleFrequency, nextScheduledAt } from "@/lib/scheduling";
import { recordAuditEvent } from "@/lib/security-controls";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { assessEndpoint } from "@/lib/security-assessment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const publicMonitorFields = "id,name,url,baseline_status,last_status_code,last_result,last_checked_at,created_at,updated_at,schedule_frequency,next_check_at,email_alerts,is_demo";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getRequestAuth();
  if (!auth) return unauthorized();
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Supabase is not connected." }, { status: 503 });
  const { id } = await params;
  const { data: monitor } = await supabase.from("pallos_monitors").select("*").eq("id", id).eq("user_id", auth.user.id).single();
  if (!monitor) return NextResponse.json({ error: "Monitor not found." }, { status: 404 });

  let input: { name?: string; url?: string; scheduleFrequency?: unknown; emailAlerts?: unknown };
  try { input = await request.json(); } catch { return NextResponse.json({ error: "Send valid monitor details." }, { status: 400 }); }
  const name = input.name?.trim() || monitor.name;
  const url = input.url?.trim() || monitor.url;
  if (name.length > 100) return NextResponse.json({ error: "Monitor name must be 100 characters or fewer." }, { status: 400 });

  const endpointChanged = url !== monitor.url;
  const updates: Record<string, unknown> = { name, url, updated_at: new Date().toISOString() };

  if (input.scheduleFrequency !== undefined) {
    if (!isScheduleFrequency(input.scheduleFrequency)) return NextResponse.json({ error: "Choose a valid monitoring frequency." }, { status: 400 });
    updates.schedule_frequency = input.scheduleFrequency;
    updates.next_check_at = nextScheduledAt(input.scheduleFrequency);
  }
  if (input.emailAlerts !== undefined) {
    if (typeof input.emailAlerts !== "boolean") return NextResponse.json({ error: "Email alerts must be on or off." }, { status: 400 });
    updates.email_alerts = input.emailAlerts;
  }

  let baselineCheck: Record<string, unknown> | null = null;
  if (endpointChanged) {
    const snapshot = await fetchEndpoint(url);
    if (!snapshot.ok || snapshot.body === null || snapshot.statusCode === null) {
      return NextResponse.json({ error: snapshot.errorMessage || "The updated endpoint must return successful JSON." }, { status: 400 });
    }
    updates.headers_encrypted = null;
    updates.has_auth_headers = false;
    updates.baseline_status = snapshot.statusCode;
    updates.baseline_body = null;
    updates.baseline_schema = describeSchema(snapshot.body);
    updates.last_status_code = snapshot.statusCode;
    updates.last_result = "baseline";
    updates.last_checked_at = new Date().toISOString();
    baselineCheck = {
      user_id: auth.user.id,
      monitor_id: monitor.id,
      requested_url: url,
      status_code: snapshot.statusCode,
      response_schema: describeSchema(snapshot.body),
      response_ms: snapshot.durationMs,
      outcome: "baseline",
      serious: false,
      changes: [],
      assessment: assessEndpoint(snapshot, []),
    };
  }

  const { data, error } = await supabase.from("pallos_monitors").update(updates).eq("id", id).eq("user_id", auth.user.id).select(publicMonitorFields).single();
  if (error || !data) return NextResponse.json({ error: error?.message || "Could not update the monitor." }, { status: 500 });
  if (baselineCheck) {
    const { error: checkError } = await supabase.from("pallos_checks").insert(baselineCheck);
    if (checkError) return NextResponse.json({ error: checkError.message }, { status: 500 });
  }
  await recordAuditEvent({ userId: auth.user.id, action: "monitor.updated", resourceType: "monitor", resourceId: id, metadata: { endpointChanged, scheduleChanged: input.scheduleFrequency !== undefined }, request });
  return withRefreshedSession(NextResponse.json({ monitor: data }), auth);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getRequestAuth();
  if (!auth) return unauthorized();
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Supabase is not connected." }, { status: 503 });
  const { id } = await params;
  const { data, error } = await supabase.from("pallos_monitors").delete().eq("id", id).eq("user_id", auth.user.id).select("id").maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Monitor not found." }, { status: 404 });
  await recordAuditEvent({ userId: auth.user.id, action: "monitor.deleted", resourceType: "monitor", resourceId: id, request });
  return withRefreshedSession(NextResponse.json({ ok: true }), auth);
}
