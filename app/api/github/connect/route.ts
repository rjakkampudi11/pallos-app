import { NextRequest, NextResponse } from "next/server";
import { getRequestAuth, withRefreshedSession } from "@/lib/auth";
import { createOAuthState, githubConfigured } from "@/lib/github-app";

export async function GET(request: NextRequest) {
  const auth = await getRequestAuth();
  if (!auth) return NextResponse.redirect(new URL("/login?next=/connections", request.url));
  if (!githubConfigured()) return withRefreshedSession(NextResponse.redirect(new URL("/connections?github=setup-required", request.url)), auth);

  const state = createOAuthState();
  const callback = new URL("/api/github/callback", request.url);
  callback.hostname = process.env.NODE_ENV === "production" ? "pallosagent.com" : callback.hostname;
  const authorize = new URL("https://github.com/login/oauth/authorize");
  authorize.searchParams.set("client_id", process.env.GITHUB_CLIENT_ID!);
  authorize.searchParams.set("redirect_uri", callback.toString());
  authorize.searchParams.set("state", state);

  const response = NextResponse.redirect(authorize);
  response.cookies.set("pallos-github-state", state, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 600 });
  response.cookies.set("pallos-github-user", auth.user.id, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 600 });
  return withRefreshedSession(response, auth);
}

export const dynamic = "force-dynamic";
