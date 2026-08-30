import { NextResponse } from "next/server";
import { getRequestAuth, unauthorized, withRefreshedSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await getRequestAuth();
  if (!auth) return unauthorized();
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Supabase is not connected." }, { status: 503 });
  const { data, error } = await supabase.from("pallos_audit_events").select("id,action,resource_type,resource_id,metadata,created_at").eq("user_id", auth.user.id).order("created_at", { ascending: false }).limit(50);
  if (error) {
    const setupRequired = ["42P01", "PGRST205"].includes(error.code || "");
    return withRefreshedSession(NextResponse.json({ error: setupRequired ? "Run the security controls database migration first." : error.message, setupRequired }, { status: setupRequired ? 503 : 500 }), auth);
  }
  return withRefreshedSession(NextResponse.json({ events: data || [] }), auth);
}
