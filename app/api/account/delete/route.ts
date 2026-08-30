import { NextResponse } from "next/server";
import { clearAuthCookies, getRequestAuth, unauthorized } from "@/lib/auth";
import { enforceRateLimit, recordAuditEvent } from "@/lib/security-controls";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await getRequestAuth();
  if (!auth) return unauthorized();
  const limited = await enforceRateLimit(request, { scope: "account-delete", identifier: auth.user.id, limit: 3, windowSeconds: 3600 });
  if (limited) return limited;
  const supabase = getSupabaseAdmin();
  if (!supabase || !auth.user.email) return NextResponse.json({ error: "Account deletion is unavailable." }, { status: 503 });
  let input: { password?: string; confirmation?: string };
  try { input = await request.json(); } catch { return NextResponse.json({ error: "Enter your password and confirmation." }, { status: 400 }); }
  if (input.confirmation !== "DELETE") return NextResponse.json({ error: "Type DELETE exactly to confirm." }, { status: 400 });
  if (!input.password) return NextResponse.json({ error: "Enter your current password." }, { status: 400 });
  const { error: passwordError } = await supabase.auth.signInWithPassword({ email: auth.user.email, password: input.password });
  if (passwordError) return NextResponse.json({ error: "Your password is incorrect." }, { status: 401 });

  await recordAuditEvent({ userId: auth.user.id, action: "account.deleted", request });
  const { data: projects } = await supabase.from("projects").select("id").eq("owner_id", auth.user.id);
  const projectIds = (projects || []).map((project) => project.id);
  if (projectIds.length) {
    const { data: findingRows } = await supabase.from("findings").select("id").in("project_id", projectIds);
    const findingIds = (findingRows || []).map((finding) => finding.id);
    if (findingIds.length) await supabase.from("finding_events").delete().in("finding_id", findingIds);
    await supabase.from("findings").delete().in("project_id", projectIds);
    await supabase.from("scans").delete().in("project_id", projectIds);
    await supabase.from("projects").delete().in("id", projectIds);
  }
  await supabase.from("profiles").delete().eq("id", auth.user.id);
  await supabase.from("waitlist_leads").delete().eq("normalized_email", auth.user.email.trim().toLowerCase());
  const { error } = await supabase.auth.admin.deleteUser(auth.user.id);
  if (error) return NextResponse.json({ error: "Could not permanently delete the account. No partial deletion was hidden; please contact Pallos." }, { status: 500 });
  return clearAuthCookies(NextResponse.json({ deleted: true }));
}
