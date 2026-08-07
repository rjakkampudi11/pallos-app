import { NextResponse } from "next/server";
import { clearAuthCookies, getRequestAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function POST() {
  const auth = await getRequestAuth();
  const supabase = getSupabaseAdmin();
  if (auth && supabase) await supabase.auth.admin.signOut(auth.accessToken, "global");
  return clearAuthCookies(NextResponse.json({ ok: true }));
}
