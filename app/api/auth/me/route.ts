import { NextResponse } from "next/server";
import { getRequestAuth, unauthorized, withRefreshedSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

function publicUser(auth: NonNullable<Awaited<ReturnType<typeof getRequestAuth>>>) {
  return {
    id: auth.user.id,
    email: auth.user.email || "",
    displayName: auth.user.user_metadata.display_name || auth.user.email?.split("@")[0] || "Pallos user",
  };
}

export async function GET() {
  const auth = await getRequestAuth();
  if (!auth) return unauthorized();
  return withRefreshedSession(NextResponse.json({ user: publicUser(auth) }), auth);
}

export async function PATCH(request: Request) {
  const auth = await getRequestAuth();
  if (!auth) return unauthorized();
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Supabase is not connected." }, { status: 503 });
  let input: { displayName?: string; password?: string };
  try { input = await request.json(); } catch { return NextResponse.json({ error: "Send valid account details." }, { status: 400 }); }
  const displayName = input.displayName?.trim();
  if (displayName && displayName.length > 80) return NextResponse.json({ error: "Display name must be 80 characters or fewer." }, { status: 400 });
  if (input.password && input.password.length < 8) return NextResponse.json({ error: "Use a password with at least 8 characters." }, { status: 400 });
  if (!displayName && !input.password) return NextResponse.json({ error: "Enter a display name or new password." }, { status: 400 });
  const { data, error } = await supabase.auth.admin.updateUserById(auth.user.id, {
    ...(displayName ? { user_metadata: { ...auth.user.user_metadata, display_name: displayName } } : {}),
    ...(input.password ? { password: input.password } : {}),
  });
  if (error || !data.user) return NextResponse.json({ error: error?.message || "Could not update the account." }, { status: 400 });
  const nextAuth = { ...auth, user: data.user };
  return withRefreshedSession(NextResponse.json({ user: publicUser(nextAuth) }), auth);
}

export async function DELETE() {
  const auth = await getRequestAuth();
  if (!auth) return unauthorized();
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Supabase is not connected." }, { status: 503 });
  const { error } = await supabase.auth.admin.signOut(auth.accessToken, "others");
  if (error) return NextResponse.json({ error: "Could not sign out other sessions." }, { status: 400 });
  return withRefreshedSession(NextResponse.json({ ok: true }), auth);
}
