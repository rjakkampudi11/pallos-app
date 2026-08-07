import { NextResponse } from "next/server";
import { getRequestAuth, unauthorized, withRefreshedSession } from "@/lib/auth";
import { getSupabaseAdmin, SUPABASE_SETUP_MESSAGE } from "@/lib/supabase-admin";

export async function GET() {
  const auth = await getRequestAuth();
  if (!auth) return unauthorized();
  const supabase = getSupabaseAdmin();
  if (!supabase) return withRefreshedSession(NextResponse.json({ error: SUPABASE_SETUP_MESSAGE }, { status: 503 }), auth);

  const [{ data: scans, error }, { data: repositories, error: repositoryError }] = await Promise.all([
    supabase.from("pallos_code_scans").select("*").eq("user_id", auth.user.id).order("started_at", { ascending: false }).limit(100),
    supabase.from("pallos_github_repositories").select("id, full_name, default_branch").eq("user_id", auth.user.id),
  ]);
  if (error || repositoryError) return withRefreshedSession(NextResponse.json({ error: (error || repositoryError)?.message || "Could not load scan history." }, { status: 500 }), auth);

  const repositoryMap = new Map((repositories || []).map((repository) => [repository.id, repository]));
  return withRefreshedSession(NextResponse.json({ scans: (scans || []).map((scan) => ({ ...scan, repository: repositoryMap.get(scan.repository_id) || null })) }), auth);
}

export const dynamic = "force-dynamic";
