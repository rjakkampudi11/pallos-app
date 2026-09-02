-- Persistent review decisions, verified remediation, pull-request scans,
-- and encrypted Supabase inspection connections.

alter table public.pallos_code_findings
  drop constraint if exists pallos_code_findings_status_check;

alter table public.pallos_code_findings
  add column if not exists source_hash text,
  add column if not exists resolution_reason text,
  add column if not exists resolved_at timestamptz,
  add column if not exists resolved_by_scan_id uuid references public.pallos_code_scans(id) on delete set null,
  add constraint pallos_code_findings_status_check
    check (status in ('open', 'resolved', 'superseded', 'false_positive', 'accepted_risk', 'intended_behavior', 'pr_review'));

create table if not exists public.pallos_finding_dispositions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  repository_id uuid not null references public.pallos_github_repositories(id) on delete cascade,
  fingerprint text not null,
  source_hash text not null,
  disposition text not null check (disposition in ('false_positive', 'accepted_risk', 'intended_behavior')),
  reason text not null check (char_length(reason) between 4 and 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (repository_id, fingerprint)
);

alter table public.pallos_code_scans
  add column if not exists trigger_type text not null default 'manual',
  add column if not exists branch_ref text,
  add column if not exists github_delivery_id text,
  add column if not exists pull_request_number integer,
  add column if not exists base_commit_sha text,
  add column if not exists new_findings_count integer not null default 0;

alter table public.pallos_code_scans
  drop constraint if exists pallos_code_scans_trigger_type_check;
alter table public.pallos_code_scans
  add constraint pallos_code_scans_trigger_type_check
  check (trigger_type in ('manual', 'push', 'pull_request'));

create unique index if not exists pallos_code_scans_delivery_idx
  on public.pallos_code_scans (github_delivery_id)
  where github_delivery_id is not null;

create table if not exists public.pallos_supabase_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_ref text not null,
  project_name text not null,
  management_token_encrypted text not null,
  last_inspected_at timestamptz,
  last_result jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, project_ref)
);

alter table public.pallos_finding_dispositions enable row level security;
alter table public.pallos_supabase_connections enable row level security;

grant select, insert, update, delete on public.pallos_finding_dispositions to authenticated, service_role;
grant select, insert, update, delete on public.pallos_supabase_connections to authenticated, service_role;

create policy "Users manage their finding decisions" on public.pallos_finding_dispositions
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage their Supabase inspections" on public.pallos_supabase_connections
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists pallos_dispositions_repo_idx
  on public.pallos_finding_dispositions (repository_id, fingerprint);
create index if not exists pallos_supabase_connections_user_idx
  on public.pallos_supabase_connections (user_id, updated_at desc);
