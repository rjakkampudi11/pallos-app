import { NextResponse } from "next/server";
import { parsePublicGitHubRepository } from "@/lib/public-repository-url";
import { scanPublicRepository } from "@/lib/public-repository-scan";
import { enforceRateLimit, requestAddress, securityHash } from "@/lib/security-controls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, { scope: "public-repository-scan", identifier: requestAddress(request), limit: 5, windowSeconds: 86400 });
  if (limited) return limited;

  let body: { repositoryUrl?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Enter a valid public GitHub repository URL." }, { status: 400 }); }
  const target = parsePublicGitHubRepository(typeof body.repositoryUrl === "string" ? body.repositoryUrl : "");
  if (!target) return NextResponse.json({ error: "Use a public GitHub URL like https://github.com/owner/repository." }, { status: 400 });

  try {
    const result = await scanPublicRepository(target);
    return NextResponse.json({ ...result, scanReference: securityHash(`${target.owner}/${target.name}:${result.commitSha}`).slice(0, 16) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The repository scan failed.";
    return NextResponse.json({ error: message }, { status: /could not be found|Only public|No supported/.test(message) ? 400 : 502 });
  }
}
