import { NextResponse } from "next/server";
import { enforceRateLimit, requestAddress } from "@/lib/security-controls";
import { getSupabaseAdmin, SUPABASE_SETUP_MESSAGE } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: SUPABASE_SETUP_MESSAGE }, { status: 503 });
  let input: { email?: string };
  try { input = await request.json(); } catch { return NextResponse.json({ error: "Enter a valid email." }, { status: 400 }); }
  const email = input.email?.trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "Enter your email." }, { status: 400 });
  const limited = await enforceRateLimit(request, { scope: "verification-resend", identifier: `${requestAddress(request)}:${email}`, limit: 3, windowSeconds: 3600 });
  if (limited) return limited;
  await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: `${new URL(request.url).origin}/auth/confirmed` } });
  return NextResponse.json({ message: "If that account is waiting for verification, a new email is on the way." });
}
