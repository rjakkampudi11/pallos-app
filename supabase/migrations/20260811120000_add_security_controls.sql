create table if not exists public.pallos_audit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null check (char_length(action) between 1 and 80),
  resource_type text not null default 'account',
  resource_id text,
  metadata jsonb not null default '{}'::jsonb,
  ip_hash text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists pallos_audit_events_user_created_idx on public.pallos_audit_events(user_id, created_at desc);
alter table public.pallos_audit_events enable row level security;
drop policy if exists "Users read their audit events" on public.pallos_audit_events;
create policy "Users read their audit events" on public.pallos_audit_events for select to authenticated using (auth.uid() = user_id);
revoke all on public.pallos_audit_events from anon;
grant select on public.pallos_audit_events to authenticated;
grant all on public.pallos_audit_events to service_role;

create table if not exists public.pallos_rate_limits (
  rate_key text primary key,
  request_count integer not null default 0,
  window_started_at timestamptz not null default now()
);
alter table public.pallos_rate_limits enable row level security;
revoke all on public.pallos_rate_limits from anon, authenticated;
grant all on public.pallos_rate_limits to service_role;

create or replace function public.pallos_consume_rate_limit(p_rate_key text, p_window_seconds integer, p_request_limit integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_row public.pallos_rate_limits%rowtype;
  retry_after integer;
begin
  if p_window_seconds < 1 or p_request_limit < 1 then raise exception 'Invalid rate limit settings'; end if;
  insert into public.pallos_rate_limits(rate_key, request_count, window_started_at)
  values (p_rate_key, 1, now())
  on conflict (rate_key) do update set
    request_count = case when public.pallos_rate_limits.window_started_at <= now() - make_interval(secs => p_window_seconds) then 1 else public.pallos_rate_limits.request_count + 1 end,
    window_started_at = case when public.pallos_rate_limits.window_started_at <= now() - make_interval(secs => p_window_seconds) then now() else public.pallos_rate_limits.window_started_at end
  returning * into current_row;
  retry_after := greatest(1, ceil(extract(epoch from (current_row.window_started_at + make_interval(secs => p_window_seconds) - now())))::integer);
  return jsonb_build_object('allowed', current_row.request_count <= p_request_limit, 'retry_after', retry_after);
end;
$$;
revoke all on function public.pallos_consume_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.pallos_consume_rate_limit(text, integer, integer) to service_role;

delete from public.pallos_rate_limits where window_started_at < now() - interval '2 days';
