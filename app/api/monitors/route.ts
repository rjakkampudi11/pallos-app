import { NextResponse } from "next/server";
import { getRequestAuth, unauthorized, withRefreshedSession } from "@/lib/auth";
import { describeSchema, fetchEndpoint } from "@/lib/monitoring";
import { encryptHeaders, parsePrivateHeader } from "@/lib/monitor-secrets";
import { getSupabaseAdmin, SUPABASE_SETUP_MESSAGE } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function setupRequired() {
  return NextResponse.json({ error: SUPABASE_SETUP_MESSAGE, setupRequired: true }, { status: 503 });
}

const publicMonitorFields = "id,name,url,baseline_status,last_status_code,last_result,last_checked_at,created_at,updated_at,has_auth_headers,schedule_frequency,next_check_at,email_alerts";

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

  let input: { name?: string; url?: string; headerName?: string; headerValue?: string };
  try { input = await request.json(); } catch { return NextResponse.json({ error: "Send a valid JSON request." }, { status: 400 }); }
  const url = input.url?.trim();
  if (!url) return NextResponse.json({ error: "Website API link is required." }, { status: 400 });
  let privateHeaders: Record<string, string> | null;
  try { privateHeaders = parsePrivateHeader(input.headerName, input.headerValue); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid private header." }, { status: 400 }); }

  const snapshot = await fetchEndpoint(url, privateHeaders || {});
  if (!snapshot.ok || snapshot.body === null || snapshot.statusCode === null) {
    return NextResponse.json({ error: snapshot.errorMessage || "The endpoint must return a successful JSON response before it can become a baseline." }, { status: 400 });
  }
  const defaultName = (() => { try { return new URL(url).hostname; } catch { return "Website API"; } })();
  const name = input.name?.trim() || defaultName;
  if (name.length > 100) return NextResponse.json({ error: "Monitor name must be 100 characters or fewer." }, { status: 400 });
  let headersEncrypted: string | null = null;
  try { headersEncrypted = privateHeaders ? encryptHeaders(privateHeaders) : null; }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not secure the private header." }, { status: 503 }); }

  const { data: monitor, error: monitorError } = await supabase.from("pallos_monitors").insert({
    user_id: auth.user.id,
    name,
    url,
    headers_encrypted: headersEncrypted,
    has_auth_headers: Boolean(privateHeaders),
    baseline_status: snapshot.statusCode,
    baseline_body: snapshot.body,
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
    response_body: snapshot.body,
    response_ms: snapshot.durationMs,
    outcome: "baseline",
    serious: false,
    changes: [],
  });
  if (checkError) {
    await supabase.from("pallos_monitors").delete().eq("id", monitor.id).eq("user_id", auth.user.id);
    return NextResponse.json({ error: checkError.message }, { status: 500 });
  }
  return withRefreshedSession(NextResponse.json({ monitor }, { status: 201 }), auth);
}
