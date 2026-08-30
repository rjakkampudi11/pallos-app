import { NextResponse } from "next/server";
import { setAuthCookies } from "@/lib/auth";
import { enforceRateLimit, recordAuditEvent, requestAddress } from "@/lib/security-controls";
import { getSupabaseAdmin, SUPABASE_SETUP_MESSAGE } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: SUPABASE_SETUP_MESSAGE }, { status: 503 });
  const limited = await enforceRateLimit(request, { scope: "verification-session", identifier: requestAddress(request), limit: 8, windowSeconds: 600 });
  if (limited) return limited;
  let input: { accessToken?: string; refreshToken?: string };
  try { input = await request.json(); } catch { return NextResponse.json({ error: "The verification link is invalid." }, { status: 400 }); }
  if (!input.accessToken || !input.refreshToken) return NextResponse.json({ error: "The verification link is incomplete." }, { status: 400 });
  const { data, error } = await supabase.auth.setSession({ access_token: input.accessToken, refresh_token: input.refreshToken });
  if (error || !data.session || !data.user?.email_confirmed_at) return NextResponse.json({ error: "The verification link is invalid or expired." }, { status: 401 });
  await recordAuditEvent({ userId: data.user.id, action: "auth.email_verified", request });
  return setAuthCookies(NextResponse.json({ verified: true }), data.session);
}
