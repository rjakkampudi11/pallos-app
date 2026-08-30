import { NextResponse } from "next/server";
import { getRequestAuth, unauthorized, withRefreshedSession } from "@/lib/auth";
import { describeSchema, fetchEndpoint } from "@/lib/monitoring";
import { enforceRateLimit, recordAuditEvent } from "@/lib/security-controls";
import { getSupabaseAdmin, SUPABASE_SETUP_MESSAGE } from "@/lib/supabase-admin";
import { assessEndpoint } from "@/lib/security-assessment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function setupRequired() {
  return NextResponse.json({ error: SUPABASE_SETUP_MESSAGE, setupRequired: true }, { status: 503 });
}

const publicMonitorFields = "id,name,url,baseline_status,last_status_code,last_result,last_checked_at,created_at,updated_at,schedule_frequency,next_check_at,email_alerts,is_demo";

export async function GET() {
  const auth = await getRequestAuth();
  if (!auth) return unauthorized();
  const supabase = getSupabaseAdmin();
  if (!supabase) return setupRequired();
  const [monitorsResult, checksResult, incidentsResult] = await Promise.all([
    supabase.from("pallos_monitors").select(publicMonitorFields).eq("user_id", auth.user.id).order("created_at", { ascending: false }),
    supabase.from("pallos_checks").select("*").eq("user_id", auth.user.id).order("checked_at", { ascending: false }).limit(100),
    supabase.from("pallos_incidents").select("*").eq("user_id", auth.user.id).order("created_at", { ascending: false }).limit(100),
  ]);
  const error = monitorsResult.error || checksResult.error || incidentsResult.error;
  if (error) return withRefreshedSession(NextResponse.json({ error: error.message }, { status: 500 }), auth);

  const monitors = (monitorsResult.data || []).map((monitor) => ({
    ...monitor,
    checks: (checksResult.data || []).filter((check) => check.monitor_id === monitor.id).slice(0, 10),
    incidents: (incidentsResult.data || []).filter((incident) => incident.monitor_id === monitor.id).slice(0, 10),
  }));
  return withRefreshedSession(NextResponse.json({ monitors, emailConfigured: Boolean(process.env.RESEND_API_KEY) }), auth);
}

export async function POST(request: Request) {
  const auth = await getRequestAuth();
  if (!auth) return unauthorized();
  const supabase = getSupabaseAdmin();
  if (!supabase) return setupRequired();
  const limited = await enforceRateLimit(request, { scope: "monitor-create", identifier: auth.user.id, limit: 10, windowSeconds: 3600 });
  if (limited) return limited;

  const { count } = await supabase.from("pallos_monitors").select("id", { count: "exact", head: true }).eq("user_id", auth.user.id).eq("is_demo", false);
  if ((count || 0) >= 3) return NextResponse.json({ error: "The tester plan supports up to 3 live monitors." }, { status: 409 });

  let input: { name?: string; url?: string };
  try { input = await request.json(); } catch { return NextResponse.json({ error: "Send a valid JSON request." }, { status: 400 }); }
  const url = input.url?.trim();
  if (!url) return NextResponse.json({ error: "Website API link is required." }, { status: 400 });
  const snapshot = await fetchEndpoint(url);
  if (!snapshot.ok || snapshot.body === null || snapshot.statusCode === null) {
    return NextResponse.json({ error: snapshot.errorMessage || "The endpoint must return a successful JSON response before it can become a baseline." }, { status: 400 });
  }
  const defaultName = (() => { try { return new URL(url).hostname; } catch { return "Website API"; } })();
  const name = input.name?.trim() || defaultName;
  if (name.length > 100) return NextResponse.json({ error: "Monitor name must be 100 characters or fewer." }, { status: 400 });
  const { data: monitor, error: monitorError } = await supabase.from("pallos_monitors").insert({
    user_id: auth.user.id,
    name,
    url,
    headers_encrypted: null,
    has_auth_headers: false,
    baseline_status: snapshot.statusCode,
    baseline_body: null,
    baseline_schema: describeSchema(snapshot.body),
    last_status_code: snapshot.statusCode,
    last_result: "baseline",
    last_checked_at: new Date().toISOString(),
  }).select(publicMonitorFields).single();
  if (monitorError || !monitor) return NextResponse.json({ error: monitorError?.message || "Could not save the monitor." }, { status: 500 });

  const { error: checkError } = await supabase.from("pallos_checks").insert({
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
  });
  if (checkError) {
    await supabase.from("pallos_monitors").delete().eq("id", monitor.id).eq("user_id", auth.user.id);
    return NextResponse.json({ error: checkError.message }, { status: 500 });
  }
  await recordAuditEvent({ userId: auth.user.id, action: "monitor.created", resourceType: "monitor", resourceId: monitor.id, metadata: { hostname: new URL(url).hostname }, request });
  return withRefreshedSession(NextResponse.json({ monitor }, { status: 201 }), auth);
}
