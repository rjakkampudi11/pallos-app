import { NextResponse } from "next/server";
import { getRequestAuth, unauthorized, withRefreshedSession } from "@/lib/auth";
import { runGitHubRepositoryScan } from "@/lib/github-scanner";
import { enforceRateLimit, recordAuditEvent } from "@/lib/security-controls";
import { getSupabaseAdmin, SUPABASE_SETUP_MESSAGE } from "@/lib/supabase-admin";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getRequestAuth();
  if (!auth) return unauthorized();
  const supabase = getSupabaseAdmin();
  if (!supabase) return withRefreshedSession(NextResponse.json({ error: SUPABASE_SETUP_MESSAGE }, { status: 503 }), auth);
  const limited = await enforceRateLimit(request, { scope: "github-scan", identifier: auth.user.id, limit: 10, windowSeconds: 3600 });
  if (limited) return limited;
  const { id } = await params;
  const { data: repository, error: repositoryError } = await supabase.from("pallos_github_repositories").select("*").eq("id", id).eq("user_id", auth.user.id).maybeSingle();
  if (repositoryError) return withRefreshedSession(NextResponse.json({ error: repositoryError.message }, { status: 500 }), auth);
  if (!repository) return withRefreshedSession(NextResponse.json({ error: "Repository not found." }, { status: 404 }), auth);

  try {
    const result = await runGitHubRepositoryScan({ repository: { ...repository, user_id: auth.user.id }, triggerType: "manual" });
    await recordAuditEvent({ userId: auth.user.id, action: "repository.scanned", resourceType: "repository", resourceId: id, metadata: { repository: repository.full_name, findings: result.scan.findings_count }, request });
    return withRefreshedSession(NextResponse.json(result), auth);
  } catch (error) {
    const message = error instanceof Error ? error.message : "The GitHub scan failed.";
    return withRefreshedSession(NextResponse.json({ error: message }, { status: 502 }), auth);
  }
}

export const maxDuration = 60;
