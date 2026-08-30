import { NextResponse } from "next/server";
import { getRequestAuth, unauthorized, withRefreshedSession } from "@/lib/auth";
import { enforceRateLimit, recordAuditEvent } from "@/lib/security-controls";
import { getSupabaseAdmin, SUPABASE_SETUP_MESSAGE } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const clean = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character] || character);

export async function POST(request: Request) {
  const auth = await getRequestAuth();
  if (!auth) return unauthorized();
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: SUPABASE_SETUP_MESSAGE, setupRequired: true }, { status: 503 });
  const limited = await enforceRateLimit(request, { scope: "tester-feedback", identifier: auth.user.id, limit: 5, windowSeconds: 86400 });
  if (limited) return limited;
  let input: Record<string, unknown>;
  try { input = await request.json(); } catch { return NextResponse.json({ error: "Send valid feedback." }, { status: 400 }); }
  const usefulness = Number(input.usefulness);
  const feedback = {
    user_id: auth.user.id, usefulness,
    setup_clarity: clean(input.setupClarity, 40), detection_clarity: clean(input.detectionClarity, 40),
    confusing_text: clean(input.confusingText, 2000), missing_feature: clean(input.missingFeature, 2000),
    reuse_intent: clean(input.reuseIntent, 40), willingness_to_pay: clean(input.willingnessToPay, 80),
    contact_permission: input.contactPermission === true,
  };
  if (!Number.isInteger(usefulness) || usefulness < 1 || usefulness > 10 || !feedback.setup_clarity || !feedback.detection_clarity || !feedback.reuse_intent || !feedback.willingness_to_pay) return NextResponse.json({ error: "Complete each required feedback field." }, { status: 400 });
  const inserted = await supabase.from("pallos_tester_feedback").insert(feedback).select("id").single();
  if (inserted.error) return NextResponse.json({ error: inserted.error.message }, { status: 500 });

  let emailed = false;
  if (process.env.RESEND_API_KEY) {
    const rows = Object.entries(feedback).filter(([key]) => key !== "user_id").map(([key, value]) => `<p><strong>${escapeHtml(key.replaceAll("_", " "))}:</strong> ${escapeHtml(String(value))}</p>`).join("");
    const emailResponse = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: process.env.PALLOS_ALERT_FROM || "Pallos <notify@pallosagent.com>", to: [process.env.PALLOS_FEEDBACK_TO || "pallosagent@gmail.com"], subject: `New Pallos tester feedback: ${usefulness}/10`, html: `<h2>Tester feedback</h2><p>Account: ${escapeHtml(auth.user.email || "unknown")}</p>${rows}` }) });
    emailed = emailResponse.ok;
  }
  await recordAuditEvent({ userId: auth.user.id, action: "tester.feedback_submitted", resourceType: "feedback", resourceId: inserted.data?.id, metadata: { emailed }, request });
  return withRefreshedSession(NextResponse.json({ ok: true, emailed }), auth);
}
