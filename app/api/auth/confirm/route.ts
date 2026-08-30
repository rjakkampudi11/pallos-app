import { NextRequest, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { setAuthCookies } from "@/lib/auth";
import { recordAuditEvent } from "@/lib/security-controls";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const allowedTypes = new Set<EmailOtpType>(["signup", "email", "email_change"]);

export async function GET(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
  const next = request.nextUrl.searchParams.get("next");
  const destination = next?.startsWith("/") && !next.startsWith("//") ? next : "/home";
  if (!supabase || !tokenHash || !type || !allowedTypes.has(type)) return NextResponse.redirect(new URL("/login?verified=failed", request.url));
  const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  if (error || !data.session || !data.user) return NextResponse.redirect(new URL("/login?verified=failed", request.url));
  await recordAuditEvent({ userId: data.user.id, action: "auth.email_verified", request });
  return setAuthCookies(NextResponse.redirect(new URL(destination, request.url)), data.session);
}
