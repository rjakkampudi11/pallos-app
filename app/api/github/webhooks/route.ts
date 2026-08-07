import { after } from "next/server";
import { runGitHubRepositoryScan, type GitHubRepositoryRecord } from "@/lib/github-scanner";
import { verifyGitHubWebhookSignature } from "@/lib/github-webhook";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type PushPayload = {
  after?: string;
  deleted?: boolean;
  ref?: string;
  installation?: { id?: number };
  repository?: { id?: number };
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
  if (event !== "push") return Response.json({ accepted: true, ignored: "unsupported_event" }, { status: 202 });

  const deliveryId = request.headers.get("x-github-delivery");
  if (!deliveryId) return Response.json({ error: "Missing delivery ID." }, { status: 400 });

  let payload: PushPayload;
  try { payload = JSON.parse(body) as PushPayload; }
  catch { return Response.json({ error: "Invalid JSON payload." }, { status: 400 }); }

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
