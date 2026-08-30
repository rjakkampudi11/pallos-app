import { NextResponse } from "next/server";
import { getRequestAuth, unauthorized, withRefreshedSession } from "@/lib/auth";
import { runMonitorCheck, type MonitorRecord } from "@/lib/run-monitor-check";
import { enforceRateLimit, recordAuditEvent } from "@/lib/security-controls";
import { getSupabaseAdmin, SUPABASE_SETUP_MESSAGE } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getRequestAuth();
  if (!auth) return unauthorized();
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: SUPABASE_SETUP_MESSAGE, setupRequired: true }, { status: 503 });
  const limited = await enforceRateLimit(request, { scope: "monitor-check", identifier: auth.user.id, limit: 30, windowSeconds: 3600 });
  if (limited) return limited;
  const { id } = await params;
  const { data: monitor, error: monitorError } = await supabase.from("pallos_monitors").select("*").eq("id", id).eq("user_id", auth.user.id).single();
  if (monitorError || !monitor) return NextResponse.json({ error: "Monitor not found." }, { status: 404 });

  let input: { checkUrl?: string } = {};
  try { input = await request.json(); } catch { /* An empty body checks the saved URL. */ }
  let result: Awaited<ReturnType<typeof runMonitorCheck>>;
  try { result = await runMonitorCheck(supabase, monitor as MonitorRecord, { requestedUrl: input.checkUrl }); }
  catch (caught) { return NextResponse.json({ error: caught instanceof Error ? caught.message : "The check failed." }, { status: 500 }); }
  await recordAuditEvent({ userId: auth.user.id, action: "monitor.checked", resourceType: "monitor", resourceId: id, metadata: { outcome: result.outcome, incidentCreated: result.incidentCreated, statusCode: result.snapshot.statusCode }, request });

  return withRefreshedSession(NextResponse.json({
    check: result.check,
    incident: result.incident,
    incidentCreated: result.incidentCreated,
    alert: result.alert,
    monitor: {
      id: monitor.id,
      name: monitor.name,
      url: monitor.url,
      last_status_code: result.snapshot.statusCode,
      last_result: result.outcome,
      last_checked_at: result.check.checked_at,
      has_auth_headers: monitor.has_auth_headers,
    },
  }), auth);
}
