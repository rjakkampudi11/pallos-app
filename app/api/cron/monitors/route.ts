import { NextResponse } from "next/server";
import { runMonitorCheck, type MonitorRecord } from "@/lib/run-monitor-check";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Supabase is not connected." }, { status: 503 });

  const { data, error } = await supabase.from("pallos_monitors").select("*").neq("schedule_frequency", "manual").lte("next_check_at", new Date().toISOString()).order("next_check_at", { ascending: true }).limit(20);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results = [];
  for (const monitor of (data || []) as MonitorRecord[]) {
    try {
      const result = await runMonitorCheck(supabase, monitor, { scheduled: true });
      results.push({ monitorId: monitor.id, outcome: result.outcome, incidentCreated: result.incidentCreated, alert: result.alert.status });
    } catch (caught) {
      results.push({ monitorId: monitor.id, outcome: "failed", error: caught instanceof Error ? caught.message : "Unknown scheduler error." });
    }
  }
  return NextResponse.json({ checked: results.length, results, ranAt: new Date().toISOString() });
}

