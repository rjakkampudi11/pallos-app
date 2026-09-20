import { NextResponse } from "next/server";
import { getRequestAuth, unauthorized, withRefreshedSession } from "@/lib/auth";
import { decryptHeaders, encryptHeaders } from "@/lib/monitor-secrets";
import { enforceRateLimit, recordAuditEvent } from "@/lib/security-controls";
import { getSupabaseAdmin, SUPABASE_SETUP_MESSAGE } from "@/lib/supabase-admin";
import { inspectSupabaseProject } from "@/lib/supabase-inspector";

export async function GET() {
  const auth = await getRequestAuth();
  if (!auth) return unauthorized();
  const supabase = getSupabaseAdmin();
  if (!supabase) return withRefreshedSession(NextResponse.json({ error: SUPABASE_SETUP_MESSAGE }, { status: 503 }), auth);
  const { data, error } = await supabase.from("pallos_supabase_connections").select("id,project_ref,project_name,last_inspected_at,last_result,created_at").eq("user_id", auth.user.id).order("updated_at", { ascending: false });
  if (error) {
    console.error("Supabase connections could not be loaded", error.code);
    return withRefreshedSession(NextResponse.json({ error: "We couldn’t load your database connections. Please try again shortly." }, { status: 503 }), auth);
  }
  return withRefreshedSession(NextResponse.json({ connections: data || [] }), auth);
}

export async function POST(request: Request) {
  const auth = await getRequestAuth();
  if (!auth) return unauthorized();
  const limited = await enforceRateLimit(request, { scope: "supabase-inspection", identifier: auth.user.id, limit: 10, windowSeconds: 3600 });
  if (limited) return limited;
  const supabase = getSupabaseAdmin();
  if (!supabase) return withRefreshedSession(NextResponse.json({ error: SUPABASE_SETUP_MESSAGE }, { status: 503 }), auth);
  let input: { projectRef?: string; projectName?: string; managementToken?: string; connectionId?: string };
  try { input = await request.json(); } catch { return NextResponse.json({ error: "Send valid Supabase project details." }, { status: 400 }); }

  if (!input || typeof input !== "object" || [input.projectRef, input.projectName, input.managementToken, input.connectionId].some((value) => value !== undefined && typeof value !== "string")) return NextResponse.json({ error: "Enter valid project details." }, { status: 400 });
  try {
  let projectRef = input.projectRef?.trim() || "";
  let projectName = input.projectName?.trim() || projectRef;
  let token = input.managementToken?.trim() || "";
  const connectionId = input.connectionId || "";
  if (connectionId) {
    const { data, error } = await supabase.from("pallos_supabase_connections").select("*").eq("id", connectionId).eq("user_id", auth.user.id).single();
    if (error && error.code !== "PGRST116") throw error;
    if (!data) return NextResponse.json({ error: "Supabase connection not found." }, { status: 404 });
    projectRef = data.project_ref; projectName = data.project_name; token = decryptHeaders(data.management_token_encrypted).authorization || "";
  }
  if (!/^[a-z0-9]{8,40}$/i.test(projectRef) || token.length < 20 || token.length > 500) return NextResponse.json({ error: "Enter a valid project reference and Supabase management token." }, { status: 400 });

    const result = await inspectSupabaseProject(projectRef, token);
    const encrypted = encryptHeaders({ authorization: token });
    const payload = { user_id: auth.user.id, project_ref: projectRef, project_name: projectName.slice(0, 100), management_token_encrypted: encrypted, last_inspected_at: result.checkedAt, last_result: result, updated_at: result.checkedAt };
    const saved = connectionId
      ? await supabase.from("pallos_supabase_connections").update(payload).eq("id", connectionId).eq("user_id", auth.user.id).select("id").single()
      : await supabase.from("pallos_supabase_connections").upsert(payload, { onConflict: "user_id,project_ref" }).select("id").single();
    if (saved.error) throw saved.error;
    await recordAuditEvent({ userId: auth.user.id, action: "supabase.inspected", resourceType: "supabase_project", resourceId: saved.data?.id, metadata: { projectRef, findings: result.findings.length }, request });
    return withRefreshedSession(NextResponse.json({ connectionId: saved.data?.id, result }), auth);
  } catch {
    return withRefreshedSession(NextResponse.json({ error: "We couldn’t complete the inspection. Check your project reference and token permissions, then try again. If it continues, contact Pallos through Help & feedback." }, { status: 502 }), auth);
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
