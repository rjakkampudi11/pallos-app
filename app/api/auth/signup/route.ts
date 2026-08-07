import { NextResponse } from "next/server";
import { setAuthCookies } from "@/lib/auth";
import { getSupabaseAdmin, SUPABASE_SETUP_MESSAGE } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: SUPABASE_SETUP_MESSAGE }, { status: 503 });
  let input: { email?: string; password?: string; displayName?: string };
  try { input = await request.json(); } catch { return NextResponse.json({ error: "Enter valid account details." }, { status: 400 }); }
  const email = input.email?.trim().toLowerCase();
  const displayName = input.displayName?.trim() || email?.split("@")[0] || "Pallos user";
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  if (!input.password || input.password.length < 8) return NextResponse.json({ error: "Use a password with at least 8 characters." }, { status: 400 });
  if (displayName.length > 80) return NextResponse.json({ error: "Display name must be 80 characters or fewer." }, { status: 400 });

  const { error: createError } = await supabase.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });
  if (createError) return NextResponse.json({ error: createError.message.includes("already") ? "An account with that email already exists." : "Could not create the account." }, { status: 400 });
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: input.password });
  if (error || !data.session) return NextResponse.json({ error: "Account created. Please log in." }, { status: 201 });
  return setAuthCookies(NextResponse.json({ user: { id: data.user.id, email: data.user.email, displayName } }, { status: 201 }), data.session);
}
