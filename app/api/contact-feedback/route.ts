import { NextResponse } from "next/server";
import { getRequestAuth, unauthorized, withRefreshedSession } from "@/lib/auth";
import { enforceRateLimit, recordAuditEvent } from "@/lib/security-controls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const clean = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character] || character);

export async function POST(request: Request) {
  const auth = await getRequestAuth();
  if (!auth) return unauthorized();
  const limited = await enforceRateLimit(request, { scope: "contact-feedback", identifier: auth.user.id, limit: 8, windowSeconds: 86400 });
  if (limited) return limited;

  let input: Record<string, unknown>;
  try { input = await request.json(); } catch { return NextResponse.json({ error: "Send valid feedback." }, { status: 400 }); }
  const message = clean(input.message, 2000);
  if (!message) return NextResponse.json({ error: "Write a message before sending." }, { status: 400 });

  await recordAuditEvent({ userId: auth.user.id, action: "feedback.message_submitted", resourceType: "feedback", metadata: { message }, request });

  if (process.env.RESEND_API_KEY) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.PALLOS_ALERT_FROM || "Pallos <notify@pallosagent.com>",
        to: [process.env.PALLOS_FEEDBACK_TO || "pallosagent@gmail.com"],
        subject: "New Pallos feedback message",
        html: `<h2>Feedback message</h2><p><strong>Account:</strong> ${escapeHtml(auth.user.email || "unknown")}</p><p>${escapeHtml(message).replace(/\n/g, "<br />")}</p>`,
      }),
    });
    if (!response.ok) console.error("Feedback notification could not be delivered", response.status);
  }

  return withRefreshedSession(NextResponse.json({ ok: true }), auth);
}
