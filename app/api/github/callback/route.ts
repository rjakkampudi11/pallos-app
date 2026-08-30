import { NextRequest, NextResponse } from "next/server";
import { getRequestAuth, withRefreshedSession } from "@/lib/auth";
import { ensureRepositoryPushWebhook, exchangeOAuthCode, githubAppSlug, listUserInstallationRepositories, listUserInstallations } from "@/lib/github-app";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { recordAuditEvent } from "@/lib/security-controls";

function finish(request: NextRequest, auth: NonNullable<Awaited<ReturnType<typeof getRequestAuth>>>, result: string) {
  const response = NextResponse.redirect(new URL(`/connections?github=${encodeURIComponent(result)}`, request.url));
  response.cookies.set("pallos-github-state", "", { path: "/", maxAge: 0 });
  response.cookies.set("pallos-github-user", "", { path: "/", maxAge: 0 });
  return withRefreshedSession(response, auth);
}

export async function GET(request: NextRequest) {
  const auth = await getRequestAuth();
  if (!auth) return NextResponse.redirect(new URL("/login?next=/connections", request.url));
  const state = request.nextUrl.searchParams.get("state");
  const code = request.nextUrl.searchParams.get("code");
  const expectedState = request.cookies.get("pallos-github-state")?.value;
  const expectedUser = request.cookies.get("pallos-github-user")?.value;
  if (!code || !state || state !== expectedState || expectedUser !== auth.user.id) return finish(request, auth, "invalid-state");

  const supabase = getSupabaseAdmin();
  if (!supabase) return finish(request, auth, "database-required");
  try {
    const userToken = await exchangeOAuthCode(code);
    const installations = await listUserInstallations(userToken);
    if (installations.length === 0) {
      const slug = githubAppSlug();
      return finish(request, auth, slug ? "install-required" : "setup-required");
    }

    let webhookWarning = false;
    for (const installation of installations) {
      const repositories = await listUserInstallationRepositories(userToken, installation.id);
      const { error: installationError } = await supabase.from("pallos_github_installations").upsert({
        user_id: auth.user.id,
        installation_id: installation.id,
        account_login: installation.account.login,
        account_type: installation.account.type,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,installation_id" });
      if (installationError) throw installationError;
      if (repositories.length > 0) {
        const { error: repositoryError } = await supabase.from("pallos_github_repositories").upsert(repositories.map((repo) => ({
          user_id: auth.user.id,
          installation_id: installation.id,
          github_repository_id: repo.id,
          owner_login: repo.owner.login,
          name: repo.name,
          full_name: repo.full_name,
          default_branch: repo.default_branch,
          is_private: repo.private,
          selected: true,
          updated_at: new Date().toISOString(),
        })), { onConflict: "user_id,github_repository_id" });
        if (repositoryError) throw repositoryError;

        const webhookResults = await Promise.allSettled(repositories.map((repo) => ensureRepositoryPushWebhook(installation.id, repo.full_name)));
        if (webhookResults.some((result) => result.status === "rejected")) {
          webhookWarning = true;
          for (const result of webhookResults) {
            if (result.status === "rejected") console.error("GitHub repository webhook setup failed", result.reason instanceof Error ? result.reason.message : result.reason);
          }
        }
      }
    }
    await recordAuditEvent({ userId: auth.user.id, action: "github.connected", resourceType: "connector", metadata: { installations: installations.length, webhookWarning }, request });
    return finish(request, auth, webhookWarning ? "connected-webhook-warning" : "connected");
  } catch (error) {
    console.error("GitHub callback failed", error instanceof Error ? error.message : error);
    return finish(request, auth, "failed");
  }
}

export const dynamic = "force-dynamic";
