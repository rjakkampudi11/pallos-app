import "server-only";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const ACCESS_COOKIE = "pallos-access-token";
const REFRESH_COOKIE = "pallos-refresh-token";

export type RequestAuth = {
  user: User;
  accessToken: string;
  refreshedSession: Session | null;
};

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export function setAuthCookies(response: NextResponse, session: Session) {
  response.cookies.set(ACCESS_COOKIE, session.access_token, { ...cookieOptions, maxAge: session.expires_in });
  response.cookies.set(REFRESH_COOKIE, session.refresh_token, { ...cookieOptions, maxAge: 60 * 60 * 24 * 30 });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export function clearAuthCookies(response: NextResponse) {
  response.cookies.set(ACCESS_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  response.cookies.set(REFRESH_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export function withRefreshedSession(response: NextResponse, auth: RequestAuth) {
  response.headers.set("Cache-Control", "private, no-store");
  return auth.refreshedSession ? setAuthCookies(response, auth.refreshedSession) : response;
}

export async function getRequestAuth(): Promise<RequestAuth | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;

  if (accessToken) {
    const { data } = await supabase.auth.getUser(accessToken);
    if (data.user) return { user: data.user, accessToken, refreshedSession: null };
  }

  if (!refreshToken) return null;
  const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
  if (error || !data.session || !data.user) return null;
  return { user: data.user, accessToken: data.session.access_token, refreshedSession: data.session };
}

export function unauthorized() {
  return clearAuthCookies(NextResponse.json({ error: "Please log in to continue." }, { status: 401 }));
}
