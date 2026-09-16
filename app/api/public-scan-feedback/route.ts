import { NextResponse } from "next/server";
import { enforceRateLimit, requestAddress } from "@/lib/security-controls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const clean = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character] || character);

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, { scope: "public-scan-feedback", identifier: requestAddress(request), limit: 8, windowSeconds: 86400 });
  if (limited) return limited;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Send valid feedback." }, { status: 400 }); }
  const useful = clean(body.useful, 20);
  const improvement = clean(body.improvement, 1200);
  const repository = clean(body.repository, 200);
  const scanReference = clean(body.scanReference, 40);
  if (!['Yes', 'Somewhat', 'No'].includes(useful) || !improvement) return NextResponse.json({ error: "Answer both feedback questions." }, { status: 400 });

  if (process.env.RESEND_API_KEY) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.PALLOS_ALERT_FROM || "Pallos <notify@pallosagent.com>",
        to: [process.env.PALLOS_FEEDBACK_TO || "pallosagent@gmail.com"],
        subject: `Public scan feedback: ${useful}`,
        html: `<h2>Public repository scan feedback</h2><p><strong>Repository:</strong> ${escapeHtml(repository || "not supplied")}</p><p><strong>Reference:</strong> ${escapeHtml(scanReference || "not supplied")}</p><p><strong>Useful:</strong> ${escapeHtml(useful)}</p><p><strong>Unclear or missing:</strong> ${escapeHtml(improvement)}</p>`,
      }),
    });
    if (!response.ok) return NextResponse.json({ error: "Feedback could not be sent. Please try again." }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
