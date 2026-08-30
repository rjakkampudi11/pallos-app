alter table public.pallos_monitors alter column baseline_body drop not null;
alter table public.pallos_monitors add column if not exists is_demo boolean not null default false;
alter table public.pallos_checks add column if not exists response_schema jsonb;

-- Pallos stores response shape, not customer response values.
update public.pallos_monitors set baseline_body = null;
update public.pallos_checks set response_body = null;

create table if not exists public.pallos_tester_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  usefulness integer not null check (usefulness between 1 and 10),
  setup_clarity text not null check (char_length(setup_clarity) between 1 and 40),
  detection_clarity text not null check (char_length(detection_clarity) between 1 and 40),
  confusing_text text not null default '' check (char_length(confusing_text) <= 2000),
  missing_feature text not null default '' check (char_length(missing_feature) <= 2000),
  reuse_intent text not null check (char_length(reuse_intent) between 1 and 40),
  willingness_to_pay text not null check (char_length(willingness_to_pay) between 1 and 80),
  contact_permission boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists pallos_tester_feedback_user_created_idx on public.pallos_tester_feedback(user_id, created_at desc);
alter table public.pallos_tester_feedback enable row level security;
drop policy if exists "Users create their tester feedback" on public.pallos_tester_feedback;
create policy "Users create their tester feedback" on public.pallos_tester_feedback for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users read their tester feedback" on public.pallos_tester_feedback;
create policy "Users read their tester feedback" on public.pallos_tester_feedback for select to authenticated using (auth.uid() = user_id);
revoke all on public.pallos_tester_feedback from anon;
grant select, insert on public.pallos_tester_feedback to authenticated;
grant all on public.pallos_tester_feedback to service_role;
