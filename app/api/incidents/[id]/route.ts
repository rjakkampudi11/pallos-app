import { NextResponse } from "next/server";
import { getRequestAuth, unauthorized, withRefreshedSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getRequestAuth();
  if (!auth) return unauthorized();
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Supabase is not connected." }, { status: 503 });
  let input: { status?: "open" | "resolved" };
  try { input = await request.json(); } catch { return NextResponse.json({ error: "Send a valid incident status." }, { status: 400 }); }
  if (input.status !== "open" && input.status !== "resolved") return NextResponse.json({ error: "Incident status must be open or resolved." }, { status: 400 });
  const { id } = await params;
  const { data, error } = await supabase.from("pallos_incidents").update({
    status: input.status,
    resolved_at: input.status === "resolved" ? new Date().toISOString() : null,
  }).eq("id", id).eq("user_id", auth.user.id).select("id,status,resolved_at").maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Incident not found." }, { status: 404 });
  return withRefreshedSession(NextResponse.json({ incident: data }), auth);
}
