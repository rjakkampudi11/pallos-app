import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0].toLowerCase();
  const isVercelDeployment = host?.endsWith(".vercel.app") ?? false;
  if (host === "www.pallosagent.com" || host === "www.pallosagent.info") {
    const url = request.nextUrl.clone();
    url.hostname = "pallosagent.com";
    return NextResponse.redirect(url, 308);
  }
  if (host === "pallosagent.info") {
    const url = request.nextUrl.clone();
    url.hostname = "pallosagent.com";
    return NextResponse.redirect(url, 308);
  }
  if (host === "pallosagent.com" || isVercelDeployment || host === "localhost" || host === "127.0.0.1") {
    const path = request.nextUrl.pathname;
    const hasSession = Boolean(request.cookies.get("pallos-access-token")?.value || request.cookies.get("pallos-refresh-token")?.value);
    // The public homepage must always stay public, even when a session exists.
    if (path === "/") {
      return NextResponse.next();
    }
    if (path === "/monitor") {
      const url = request.nextUrl.clone();
      url.pathname = hasSession ? "/projects" : "/login";
      if (!hasSession) url.searchParams.set("next", "/projects");
      return NextResponse.redirect(url);
    }
    if (path === "/app" || path === "/agent") {
      const url = request.nextUrl.clone();
      url.pathname = hasSession ? "/home" : "/login";
      return NextResponse.redirect(url);
    }
    const workspaceRoutes = ["/home", "/findings", "/projects", "/agent-runs", "/connections", "/insights", "/activity", "/settings", "/contact"];
    if (workspaceRoutes.includes(path)) {
      if (!hasSession) {
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = "/login";
        loginUrl.searchParams.set("next", path);
        return NextResponse.redirect(loginUrl);
      }
      const url = request.nextUrl.clone();
      url.pathname = "/agent";
      const response = NextResponse.rewrite(url);
      response.headers.set("X-Robots-Tag", "noindex, nofollow");
      return response;
    }
    if (path === "/login" || path.startsWith("/auth/") || path.startsWith("/internal/")) {
      const response = NextResponse.next();
      response.headers.set("X-Robots-Tag", "noindex, nofollow");
      return response;
    }
    return NextResponse.next();
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
