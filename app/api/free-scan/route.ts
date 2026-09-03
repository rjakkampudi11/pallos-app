import { NextRequest, NextResponse } from "next/server";
import { isPallosDemoUrl, summarizeFreeScan } from "@/lib/free-scan";
import { fetchEndpoint, validatePublicHttpsUrl } from "@/lib/monitoring";
import { enforceRateLimit, requestAddress } from "@/lib/security-controls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FREE_SCAN_COOKIE = "pallos-free-scan-used";

export async function POST(request: NextRequest) {
  let input: { url?: string };
  try { input = await request.json(); }
  catch { return NextResponse.json({ error: "Enter a valid public JSON API URL." }, { status: 400 }); }

  const rawUrl = input.url?.trim();
  if (!rawUrl) return NextResponse.json({ error: "Enter a public JSON API URL." }, { status: 400 });

  let url: URL;
  try { url = await validatePublicHttpsUrl(rawUrl); }
  catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Enter a valid public JSON API URL." }, { status: 400 });
  }

  const isDemo = isPallosDemoUrl(url);
  if (!isDemo && request.cookies.get(FREE_SCAN_COOKIE)?.value === "1") {
    return NextResponse.json({
      error: "Your free scan has already been used. You can keep testing with the safe Pallos demo API, or create a free account to scan another endpoint.",
      used: true,
    }, { status: 409, headers: { "Cache-Control": "no-store" } });
  }

  const limited = await enforceRateLimit(request, {
    scope: isDemo ? "anonymous-demo-scan" : "anonymous-free-scan",
    identifier: requestAddress(request),
    limit: isDemo ? 60 : 20,
    windowSeconds: 24 * 60 * 60,
  });
  if (limited) return limited;

  const snapshot = await fetchEndpoint(url.toString());
  const response = NextResponse.json({ result: summarizeFreeScan(url, snapshot) });
  if (!isDemo) {
    response.cookies.set(FREE_SCAN_COOKIE, "1", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
