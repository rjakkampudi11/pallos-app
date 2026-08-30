import { NextResponse } from "next/server";
import { enforceRateLimit, recordAuditEvent, requestAddress } from "@/lib/security-controls";
import { getSupabaseAdmin, SUPABASE_SETUP_MESSAGE } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: SUPABASE_SETUP_MESSAGE }, { status: 503 });
  let input: { email?: string; password?: string; displayName?: string; next?: string };
  try { input = await request.json(); } catch { return NextResponse.json({ error: "Enter valid account details." }, { status: 400 }); }
  const email = input.email?.trim().toLowerCase();
  const displayName = input.displayName?.trim() || email?.split("@")[0] || "Pallos user";
  const destination = input.next?.startsWith("/") && !input.next.startsWith("//") ? input.next : "/home";
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  if (!input.password || input.password.length < 8) return NextResponse.json({ error: "Use a password with at least 8 characters." }, { status: 400 });
  if (displayName.length > 80) return NextResponse.json({ error: "Display name must be 80 characters or fewer." }, { status: 400 });
  const limited = await enforceRateLimit(request, { scope: "signup", identifier: `${requestAddress(request)}:${email}`, limit: 3, windowSeconds: 3600 });
  if (limited) return limited;

  const origin = new URL(request.url).origin;
  const { data, error: createError } = await supabase.auth.signUp({
    email,
    password: input.password,
    options: { data: { display_name: displayName }, emailRedirectTo: `${origin}/auth/confirmed?next=${encodeURIComponent(destination)}` },
  });
  if (createError) return NextResponse.json({ error: createError.message.includes("already") ? "An account with that email already exists." : "Could not create the account." }, { status: 400 });
  if (data.user) await recordAuditEvent({ userId: data.user.id, action: "auth.signup_created", request });
  return NextResponse.json({ verificationRequired: true, message: "Check your email and verify the account before logging in." }, { status: 201 });
}
