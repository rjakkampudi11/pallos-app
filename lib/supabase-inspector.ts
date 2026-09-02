import "server-only";

export type SupabaseInspectionFinding = {
  id: string;
  severity: "critical" | "high" | "review";
  title: string;
  evidence: string;
  remediation: string;
};

type QueryRow = Record<string, unknown>;

async function managementQuery(projectRef: string, token: string, query: string): Promise<QueryRow[]> {
  const response = await fetch(`https://api.supabase.com/v1/projects/${encodeURIComponent(projectRef)}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "User-Agent": "Pallos-Agent/1.0" },
    body: JSON.stringify({ query, read_only: true }),
    signal: AbortSignal.timeout(15_000),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error((data as { message?: string } | null)?.message || `Supabase inspection failed (${response.status}).`);
  return Array.isArray(data) ? data as QueryRow[] : [];
}

const inspectionSql = `
with exposed_tables as (
  select n.nspname as schema_name, c.relname as table_name, c.relrowsecurity as rls_enabled
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where c.relkind in ('r','p') and n.nspname in ('public','storage')
), policies as (
  select schemaname as schema_name, tablename as table_name, count(*)::int as policy_count
  from pg_policies group by schemaname, tablename
), anon_privileges as (
  select table_schema as schema_name, table_name, string_agg(privilege_type, ',' order by privilege_type) as privileges
  from information_schema.role_table_grants where grantee in ('anon','public') group by table_schema, table_name
)
select t.schema_name, t.table_name, t.rls_enabled, coalesce(p.policy_count,0) as policy_count, coalesce(a.privileges,'') as anon_privileges
from exposed_tables t left join policies p using (schema_name,table_name) left join anon_privileges a using (schema_name,table_name)
order by t.schema_name,t.table_name;
`;

const policySql = `select schemaname as schema_name, tablename as table_name, policyname as policy_name, roles::text, cmd, coalesce(qual,'') as using_expression, coalesce(with_check,'') as check_expression from pg_policies where schemaname in ('public','storage') order by schemaname,tablename,policyname;`;
const bucketSql = `select id::text as bucket_id, name as bucket_name, public from storage.buckets order by name;`;
const functionSql = `select n.nspname as schema_name, p.proname as function_name, p.prosecdef as security_definer, coalesce(array_to_string(p.proacl,','),'') as acl from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosecdef=true order by p.proname;`;

export async function inspectSupabaseProject(projectRef: string, token: string) {
  const [rows, policies, buckets, functions] = await Promise.all([
    managementQuery(projectRef, token, inspectionSql),
    managementQuery(projectRef, token, policySql),
    managementQuery(projectRef, token, bucketSql),
    managementQuery(projectRef, token, functionSql),
  ]);
  const findings: SupabaseInspectionFinding[] = [];
  for (const row of rows) {
    const location = `${row.schema_name}.${row.table_name}`;
    if (!row.rls_enabled) findings.push({ id: `rls:${location}`, severity: "critical", title: `Row Level Security is disabled on ${location}`, evidence: "The live database catalog reports relrowsecurity = false.", remediation: `Enable RLS on ${location}, then add and test policies for every required operation.` });
    if (row.rls_enabled && Number(row.policy_count) === 0) findings.push({ id: `policies:${location}`, severity: "review", title: `${location} has RLS but no policies`, evidence: "RLS is enabled and the live policy count is zero.", remediation: "Confirm that denying all client access is intended; otherwise add narrowly scoped policies." });
    if (String(row.anon_privileges || "").includes("TRUNCATE") || String(row.anon_privileges || "").includes("TRIGGER")) findings.push({ id: `anon:${location}`, severity: "high", title: `${location} grants unusually broad anonymous privileges`, evidence: `Observed anonymous privileges: ${row.anon_privileges}.`, remediation: "Revoke broad anonymous privileges and grant only the operations required by tested RLS policies." });
  }
  for (const policy of policies) {
    const expressions = `${policy.using_expression} ${policy.check_expression}`.replaceAll(" ", "").toLowerCase();
    if (expressions === "true" || expressions === "(true)" || expressions === "true(true)" || expressions === "(true)(true)") findings.push({ id: `policy:${policy.schema_name}.${policy.table_name}:${policy.policy_name}`, severity: "high", title: `Policy ${String(policy.policy_name)} appears unconditional`, evidence: `${policy.schema_name}.${policy.table_name} uses an unconditional true expression for ${policy.cmd || "an operation"}.`, remediation: "Scope the policy to the authenticated user, workspace membership, or another verified ownership condition, then test with two accounts." });
  }
  for (const bucket of buckets) {
    if (bucket.public) findings.push({ id: `bucket:${bucket.bucket_id}`, severity: "high", title: `Storage bucket ${String(bucket.bucket_name)} is public`, evidence: "The live storage.buckets catalog marks this bucket public.", remediation: "Confirm every object is intentionally public. Otherwise make the bucket private and use narrowly scoped storage policies or signed URLs." });
  }
  for (const fn of functions) findings.push({ id: `function:${fn.schema_name}.${fn.function_name}`, severity: "review", title: `Function ${String(fn.function_name)} runs with definer privileges`, evidence: `The live catalog reports SECURITY DEFINER for ${fn.schema_name}.${fn.function_name}.`, remediation: "Confirm the function fixes search_path, validates the caller, exposes only required operations, and is not executable by unintended roles." });
  return { checkedAt: new Date().toISOString(), tablesChecked: rows.length, policiesChecked: policies.length, bucketsChecked: buckets.length, privilegedFunctionsChecked: functions.length, findings };
}
