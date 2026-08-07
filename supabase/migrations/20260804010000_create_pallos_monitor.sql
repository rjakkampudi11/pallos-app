create extension if not exists pgcrypto;

create table if not exists public.pallos_monitors (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  url text not null,
  baseline_status integer not null,
  baseline_body jsonb not null,
  baseline_schema jsonb not null,
  last_status_code integer,
  last_result text not null default 'baseline' check (last_result in ('baseline', 'healthy', 'changed', 'error')),
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pallos_checks (
  id uuid primary key default gen_random_uuid(),
  monitor_id uuid not null references public.pallos_monitors(id) on delete cascade,
  requested_url text not null,
  status_code integer,
  response_body jsonb,
  response_ms integer not null,
  outcome text not null check (outcome in ('baseline', 'healthy', 'changed', 'error')),
  serious boolean not null default false,
  changes jsonb not null default '[]'::jsonb,
  error_message text,
  checked_at timestamptz not null default now()
);

create table if not exists public.pallos_incidents (
  id uuid primary key default gen_random_uuid(),
  monitor_id uuid not null references public.pallos_monitors(id) on delete cascade,
  check_id uuid not null references public.pallos_checks(id) on delete cascade,
  title text not null,
  severity text not null check (severity in ('high', 'critical')),
  status text not null default 'open' check (status in ('open', 'resolved')),
  summary text not null,
  changes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists pallos_checks_monitor_checked_idx on public.pallos_checks (monitor_id, checked_at desc);
create index if not exists pallos_incidents_monitor_created_idx on public.pallos_incidents (monitor_id, created_at desc);
create index if not exists pallos_incidents_open_idx on public.pallos_incidents (status) where status = 'open';

alter table public.pallos_monitors enable row level security;
alter table public.pallos_checks enable row level security;
alter table public.pallos_incidents enable row level security;

revoke all on public.pallos_monitors from anon, authenticated;
revoke all on public.pallos_checks from anon, authenticated;
revoke all on public.pallos_incidents from anon, authenticated;
grant all on public.pallos_monitors to service_role;
grant all on public.pallos_checks to service_role;
grant all on public.pallos_incidents to service_role;
