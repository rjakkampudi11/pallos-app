import { after } from "next/server";
import { runGitHubRepositoryScan, type GitHubRepositoryRecord } from "@/lib/github-scanner";
import { verifyGitHubWebhookSignature } from "@/lib/github-webhook";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { commentOnPullRequest } from "@/lib/github-app";

type PushPayload = {
  after?: string;
  deleted?: boolean;
  ref?: string;
  installation?: { id?: number };
  repository?: { id?: number };
};

type PullRequestPayload = {
  action?: string;
  installation?: { id?: number };
  repository?: { id?: number; full_name?: string };
  pull_request?: { number?: number; head?: { sha?: string; ref?: string }; base?: { sha?: string } };
};

const deletedCommit = /^0+$/;

export async function POST(request: Request) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET || "";
  if (!secret) return Response.json({ error: "GitHub webhook is not configured." }, { status: 503 });

  const body = await request.text();
  if (!verifyGitHubWebhookSignature(body, request.headers.get("x-hub-signature-256"), secret)) {
    return Response.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  const event = request.headers.get("x-github-event");
  if (event === "ping") return Response.json({ accepted: true });
  if (event !== "push" && event !== "pull_request") return Response.json({ accepted: true, ignored: "unsupported_event" }, { status: 202 });

  const deliveryId = request.headers.get("x-github-delivery");
  if (!deliveryId) return Response.json({ error: "Missing delivery ID." }, { status: 400 });

  let parsed: PushPayload | PullRequestPayload;
  try { parsed = JSON.parse(body) as PushPayload | PullRequestPayload; }
  catch { return Response.json({ error: "Invalid JSON payload." }, { status: 400 }); }

  if (event === "pull_request") {
    const payload = parsed as PullRequestPayload;
    if (!['opened', 'reopened', 'synchronize'].includes(payload.action || "")) return Response.json({ accepted: true, ignored: "pull_request_action" }, { status: 202 });
    const installationId = payload.installation?.id;
    const repositoryId = payload.repository?.id;
    const pullRequestNumber = payload.pull_request?.number;
    const headSha = payload.pull_request?.head?.sha;
    if (!installationId || !repositoryId || !pullRequestNumber || !headSha) return Response.json({ error: "Incomplete pull request payload." }, { status: 400 });
    const supabase = getSupabaseAdmin();
    if (!supabase) return Response.json({ error: "Supabase is not configured." }, { status: 503 });
    const { data: repositories, error } = await supabase.from("pallos_github_repositories").select("*").eq("github_repository_id", repositoryId).eq("installation_id", installationId);
    if (error) return Response.json({ error: "Could not resolve the connected repository." }, { status: 500 });
    const matching = (repositories || []) as GitHubRepositoryRecord[];
    if (!matching.length) return Response.json({ accepted: true, ignored: "repository_not_monitored" }, { status: 202 });
    after(async () => {
      for (const repository of matching) {
        try {
          const result = await runGitHubRepositoryScan({ repository, triggerType: "pull_request", commitRef: headSha, branchRef: payload.pull_request?.head?.ref, deliveryId, pullRequestNumber, baseCommitSha: payload.pull_request?.base?.sha });
          const allNewFindings = result.newFindings || [];
          const newFindings = allNewFindings.slice(0, 20);
          const summary = newFindings.length
            ? newFindings.map((finding) => `- **${finding.severity.toUpperCase()}** \`${finding.file_path}${finding.line_number ? `:${finding.line_number}` : ""}\` — ${finding.title}`).join("\n")
            : "No new Pallos findings were detected in this pull request scan.";
          await commentOnPullRequest(Number(repository.installation_id), repository.full_name, pullRequestNumber, `## Pallos security review\n\n${summary}\n\n${allNewFindings.length > 20 ? `And ${allNewFindings.length - 20} additional new findings in Pallos.\n\n` : ""}This automated review is advisory and does not prove the application is vulnerability-free.`).catch((commentError) => console.error("Pallos could not post the PR comment:", commentError instanceof Error ? commentError.message : "Unknown error"));
        } catch (scanError) { console.error("Automatic pull-request scan failed:", scanError instanceof Error ? scanError.message : "Unknown error"); }
      }
    });
    return Response.json({ accepted: true, scansQueued: matching.length }, { status: 202 });
  }

  const payload = parsed as PushPayload;

  const installationId = payload.installation?.id;
  const repositoryId = payload.repository?.id;
  const commitSha = payload.after;
  if (!repositoryId || !commitSha || !payload.ref) return Response.json({ error: "Incomplete push payload." }, { status: 400 });
  if (payload.deleted || deletedCommit.test(commitSha)) return Response.json({ accepted: true, ignored: "deleted_ref" }, { status: 202 });

  const supabase = getSupabaseAdmin();
  if (!supabase) return Response.json({ error: "Supabase is not configured." }, { status: 503 });
  let repositoryQuery = supabase.from("pallos_github_repositories").select("*").eq("github_repository_id", repositoryId);
  if (installationId) repositoryQuery = repositoryQuery.eq("installation_id", installationId);
  const { data: repositories, error } = await repositoryQuery;
  if (error) return Response.json({ error: "Could not resolve the connected repository." }, { status: 500 });

  const matching = (repositories || []).filter((repository) => payload.ref === `refs/heads/${repository.default_branch}`) as GitHubRepositoryRecord[];
  if (matching.length === 0) return Response.json({ accepted: true, ignored: "repository_or_branch_not_monitored" }, { status: 202 });

  after(async () => {
    const results = await Promise.allSettled(matching.map((repository) => runGitHubRepositoryScan({
      repository,
      triggerType: "push",
      commitRef: commitSha,
      branchRef: payload.ref,
      deliveryId,
    })));
    for (const result of results) {
      if (result.status === "rejected") console.error("Automatic GitHub scan failed:", result.reason instanceof Error ? result.reason.message : "Unknown error");
    }
  });

  return Response.json({ accepted: true, scansQueued: matching.length }, { status: 202 });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
