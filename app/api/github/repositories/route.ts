import { NextResponse } from "next/server";
import { getRequestAuth, unauthorized, withRefreshedSession } from "@/lib/auth";
import { githubAppSlug, githubConfigured, removeRepositoryPushWebhook } from "@/lib/github-app";
import { recordAuditEvent } from "@/lib/security-controls";
import { getSupabaseAdmin, SUPABASE_SETUP_MESSAGE } from "@/lib/supabase-admin";

export async function GET() {
  const auth = await getRequestAuth();
  if (!auth) return unauthorized();
  const supabase = getSupabaseAdmin();
  if (!supabase) return withRefreshedSession(NextResponse.json({ error: SUPABASE_SETUP_MESSAGE, setupRequired: true }, { status: 503 }), auth);

  const [{ data: repositories, error }, { data: scans }, { data: findings }] = await Promise.all([
    supabase.from("pallos_github_repositories").select("*").eq("user_id", auth.user.id).order("updated_at", { ascending: false }),
    supabase.from("pallos_code_scans").select("*").eq("user_id", auth.user.id).order("started_at", { ascending: false }).limit(100),
    supabase.from("pallos_code_findings").select("*").eq("user_id", auth.user.id).in("status", ["open", "false_positive", "accepted_risk", "intended_behavior", "resolved"]).order("created_at", { ascending: false }).limit(500),
  ]);
  if (error) {
    const setupRequired = error.code === "42P01" || error.code === "42501" || error.code === "PGRST205" || error.message.includes("schema cache") || error.message.includes("permission denied");
    return withRefreshedSession(NextResponse.json({ error: setupRequired ? "Run the new GitHub scanner database migration first." : error.message, setupRequired }, { status: setupRequired ? 503 : 500 }), auth);
  }
  const enriched = (repositories || []).map((repository) => ({
    ...repository,
    latest_scan: (scans || []).find((scan) => scan.repository_id === repository.id && scan.trigger_type !== "pull_request") || null,
    findings: (findings || []).filter((finding) => finding.repository_id === repository.id && finding.status !== "resolved"),
    verified_fixes: (findings || []).filter((finding) => finding.repository_id === repository.id && finding.status === "resolved" && finding.resolved_by_scan_id).slice(0, 20),
  }));
  return withRefreshedSession(NextResponse.json({ repositories: enriched, configured: githubConfigured(), appSlug: githubAppSlug() }), auth);
}

export async function DELETE(request: Request) {
  const auth = await getRequestAuth();
  if (!auth) return unauthorized();
  const supabase = getSupabaseAdmin();
  if (!supabase) return withRefreshedSession(NextResponse.json({ error: SUPABASE_SETUP_MESSAGE }, { status: 503 }), auth);
  const { data: repositories } = await supabase.from("pallos_github_repositories").select("id,installation_id,full_name").eq("user_id", auth.user.id);
  const revocations = await Promise.allSettled((repositories || []).map((repository) => removeRepositoryPushWebhook(repository.installation_id, repository.full_name)));
  const providerCleanupFailed = revocations.some((result) => result.status === "rejected");
  const { error } = await supabase.from("pallos_github_repositories").delete().eq("user_id", auth.user.id);
  if (!error) await supabase.from("pallos_github_installations").delete().eq("user_id", auth.user.id);
  if (!error) await recordAuditEvent({ userId: auth.user.id, action: "github.disconnected", resourceType: "connector", metadata: { repositoriesRemoved: repositories?.length || 0, providerCleanupFailed }, request });
  return withRefreshedSession(error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ disconnected: true, providerCleanupFailed }), auth);
}

export const dynamic = "force-dynamic";
