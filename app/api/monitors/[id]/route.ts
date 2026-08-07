import { NextResponse } from "next/server";
import { getRequestAuth, unauthorized, withRefreshedSession } from "@/lib/auth";
import { describeSchema, fetchEndpoint } from "@/lib/monitoring";
import { decryptHeaders, encryptHeaders, parsePrivateHeader } from "@/lib/monitor-secrets";
import { isScheduleFrequency, nextScheduledAt } from "@/lib/scheduling";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const publicMonitorFields = "id,name,url,baseline_status,last_status_code,last_result,last_checked_at,created_at,updated_at,has_auth_headers,schedule_frequency,next_check_at,email_alerts";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getRequestAuth();
  if (!auth) return unauthorized();
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Supabase is not connected." }, { status: 503 });
  const { id } = await params;
  const { data: monitor } = await supabase.from("pallos_monitors").select("*").eq("id", id).eq("user_id", auth.user.id).single();
  if (!monitor) return NextResponse.json({ error: "Monitor not found." }, { status: 404 });

  let input: { name?: string; url?: string; headerName?: string; headerValue?: string; clearHeaders?: boolean; scheduleFrequency?: unknown; emailAlerts?: unknown };
  try { input = await request.json(); } catch { return NextResponse.json({ error: "Send valid monitor details." }, { status: 400 }); }
  const name = input.name?.trim() || monitor.name;
  const url = input.url?.trim() || monitor.url;
  if (name.length > 100) return NextResponse.json({ error: "Monitor name must be 100 characters or fewer." }, { status: 400 });

  const replacingHeaders = Boolean(input.headerName || input.headerValue);
  let privateHeaders: Record<string, string> = {};
  try {
    if (input.clearHeaders) privateHeaders = {};
    else if (replacingHeaders) privateHeaders = parsePrivateHeader(input.headerName, input.headerValue) || {};
    else privateHeaders = decryptHeaders(monitor.headers_encrypted);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update the private API headers." }, { status: 400 });
  }
  const endpointChanged = url !== monitor.url || replacingHeaders || Boolean(input.clearHeaders);
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
    const snapshot = await fetchEndpoint(url, privateHeaders);
    if (!snapshot.ok || snapshot.body === null || snapshot.statusCode === null) {
      return NextResponse.json({ error: snapshot.errorMessage || "The updated endpoint must return successful JSON." }, { status: 400 });
    }
    updates.headers_encrypted = Object.keys(privateHeaders).length ? encryptHeaders(privateHeaders) : null;
    updates.has_auth_headers = Object.keys(privateHeaders).length > 0;
    updates.baseline_status = snapshot.statusCode;
    updates.baseline_body = snapshot.body;
    updates.baseline_schema = describeSchema(snapshot.body);
    updates.last_status_code = snapshot.statusCode;
    updates.last_result = "baseline";
    updates.last_checked_at = new Date().toISOString();
    baselineCheck = {
      user_id: auth.user.id,
      monitor_id: monitor.id,
      requested_url: url,
      status_code: snapshot.statusCode,
      response_body: snapshot.body,
      response_ms: snapshot.durationMs,
      outcome: "baseline",
      serious: false,
      changes: [],
    };
  }

  const { data, error } = await supabase.from("pallos_monitors").update(updates).eq("id", id).eq("user_id", auth.user.id).select(publicMonitorFields).single();
  if (error || !data) return NextResponse.json({ error: error?.message || "Could not update the monitor." }, { status: 500 });
  if (baselineCheck) {
    const { error: checkError } = await supabase.from("pallos_checks").insert(baselineCheck);
    if (checkError) return NextResponse.json({ error: checkError.message }, { status: 500 });
  }
  return withRefreshedSession(NextResponse.json({ monitor: data }), auth);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getRequestAuth();
  if (!auth) return unauthorized();
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Supabase is not connected." }, { status: 503 });
  const { id } = await params;
  const { data, error } = await supabase.from("pallos_monitors").delete().eq("id", id).eq("user_id", auth.user.id).select("id").maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Monitor not found." }, { status: 404 });
  return withRefreshedSession(NextResponse.json({ ok: true }), auth);
}
