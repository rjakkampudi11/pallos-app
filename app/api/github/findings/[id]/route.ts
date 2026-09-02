import { NextResponse } from "next/server";
import { getRequestAuth, unauthorized, withRefreshedSession } from "@/lib/auth";
import { enforceRateLimit, recordAuditEvent } from "@/lib/security-controls";
import { getSupabaseAdmin, SUPABASE_SETUP_MESSAGE } from "@/lib/supabase-admin";

const allowed = new Set(["open", "false_positive", "accepted_risk", "intended_behavior"]);

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await getRequestAuth();
  if (!auth) return unauthorized();
  const limited = await enforceRateLimit(request, { scope: "finding-review", identifier: auth.user.id, limit: 60, windowSeconds: 3600 });
  if (limited) return limited;
  const supabase = getSupabaseAdmin();
  if (!supabase) return withRefreshedSession(NextResponse.json({ error: SUPABASE_SETUP_MESSAGE }, { status: 503 }), auth);
  const { id } = await context.params;
  let input: { disposition?: string; reason?: string };
  try { input = await request.json(); } catch { return NextResponse.json({ error: "Send a valid review decision." }, { status: 400 }); }
  const disposition = input.disposition || "";
  const reason = input.reason?.trim() || "";
  if (!allowed.has(disposition)) return NextResponse.json({ error: "Choose a supported finding status." }, { status: 400 });
  if (disposition !== "open" && (reason.length < 4 || reason.length > 500)) return NextResponse.json({ error: "Add a reason between 4 and 500 characters." }, { status: 400 });

  const { data: finding, error: findingError } = await supabase.from("pallos_code_findings").select("id,repository_id,fingerprint,source_hash").eq("id", id).eq("user_id", auth.user.id).single();
  if (findingError || !finding) return NextResponse.json({ error: "Finding not found." }, { status: 404 });
  if (!finding.source_hash) return NextResponse.json({ error: "Run a new repository scan before reviewing this older finding." }, { status: 409 });

  if (disposition === "open") {
    await supabase.from("pallos_finding_dispositions").delete().eq("repository_id", finding.repository_id).eq("fingerprint", finding.fingerprint).eq("user_id", auth.user.id);
  } else {
    const { error } = await supabase.from("pallos_finding_dispositions").upsert({ user_id: auth.user.id, repository_id: finding.repository_id, fingerprint: finding.fingerprint, source_hash: finding.source_hash, disposition, reason, updated_at: new Date().toISOString() }, { onConflict: "repository_id,fingerprint" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const { error } = await supabase.from("pallos_code_findings").update({ status: disposition, resolution_reason: disposition === "open" ? null : reason }).eq("repository_id", finding.repository_id).eq("fingerprint", finding.fingerprint).eq("source_hash", finding.source_hash).eq("user_id", auth.user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await recordAuditEvent({ userId: auth.user.id, action: "finding.reviewed", resourceType: "code_finding", resourceId: id, metadata: { disposition }, request });
  return withRefreshedSession(NextResponse.json({ updated: true, disposition }), auth);
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
