create table if not exists public.pallos_github_installations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  installation_id bigint not null,
  account_login text not null,
  account_type text not null default 'User',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, installation_id)
);

create table if not exists public.pallos_github_repositories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  installation_id bigint not null,
  github_repository_id bigint not null,
  owner_login text not null,
  name text not null,
  full_name text not null,
  default_branch text not null,
  is_private boolean not null default true,
  selected boolean not null default false,
  last_scanned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, github_repository_id)
);

create table if not exists public.pallos_code_scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  repository_id uuid not null references public.pallos_github_repositories(id) on delete cascade,
  status text not null check (status in ('running', 'completed', 'failed')),
  commit_sha text,
  files_scanned integer not null default 0,
  findings_count integer not null default 0,
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create table if not exists public.pallos_code_findings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  repository_id uuid not null references public.pallos_github_repositories(id) on delete cascade,
  scan_id uuid not null references public.pallos_code_scans(id) on delete cascade,
  fingerprint text not null,
  rule_id text not null,
  title text not null,
  severity text not null check (severity in ('critical', 'high', 'review', 'low')),
  category text not null,
  file_path text not null,
  line_number integer,
  evidence text not null,
  explanation text not null,
  suggested_fix text not null,
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now()
);

create index if not exists pallos_github_installations_user_idx on public.pallos_github_installations (user_id);
create index if not exists pallos_github_repositories_user_idx on public.pallos_github_repositories (user_id, updated_at desc);
create index if not exists pallos_code_scans_repo_idx on public.pallos_code_scans (repository_id, started_at desc);
create index if not exists pallos_code_findings_repo_idx on public.pallos_code_findings (repository_id, created_at desc);

alter table public.pallos_github_installations enable row level security;
alter table public.pallos_github_repositories enable row level security;
alter table public.pallos_code_scans enable row level security;
alter table public.pallos_code_findings enable row level security;

grant select, insert, update, delete on public.pallos_github_installations to authenticated;
grant select, insert, update, delete on public.pallos_github_repositories to authenticated;
grant select, insert, update, delete on public.pallos_code_scans to authenticated;
grant select, insert, update, delete on public.pallos_code_findings to authenticated;
grant select, insert, update, delete on public.pallos_github_installations to service_role;
grant select, insert, update, delete on public.pallos_github_repositories to service_role;
grant select, insert, update, delete on public.pallos_code_scans to service_role;
grant select, insert, update, delete on public.pallos_code_findings to service_role;

create policy "Users manage their GitHub installations" on public.pallos_github_installations
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage their GitHub repositories" on public.pallos_github_repositories
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage their code scans" on public.pallos_code_scans
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage their code findings" on public.pallos_code_findings
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
