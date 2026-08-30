import { NextResponse } from "next/server";
import { setAuthCookies } from "@/lib/auth";
import { enforceRateLimit, recordAuditEvent, requestAddress } from "@/lib/security-controls";
import { getSupabaseAdmin, SUPABASE_SETUP_MESSAGE } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: SUPABASE_SETUP_MESSAGE }, { status: 503 });
  let input: { email?: string; password?: string };
  try { input = await request.json(); } catch { return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 }); }
  const email = input.email?.trim().toLowerCase();
  if (!email || !input.password) return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  const limited = await enforceRateLimit(request, { scope: "login", identifier: `${requestAddress(request)}:${email}`, limit: 5, windowSeconds: 600 });
  if (limited) return limited;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: input.password });
  if (error || !data.session) return NextResponse.json({ error: "The email or password is incorrect." }, { status: 401 });
  if (!data.user.email_confirmed_at) return NextResponse.json({ error: "Verify your email before logging in." }, { status: 403 });
  await recordAuditEvent({ userId: data.user.id, action: "auth.login", request });
  return setAuthCookies(NextResponse.json({ user: { id: data.user.id, email: data.user.email, displayName: data.user.user_metadata.display_name || email.split("@")[0] } }), data.session);
}
