alter table public.pallos_monitors
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists headers_encrypted text,
  add column if not exists has_auth_headers boolean not null default false;

alter table public.pallos_checks
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.pallos_incidents
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

create index if not exists pallos_monitors_user_created_idx on public.pallos_monitors (user_id, created_at desc);
create index if not exists pallos_checks_user_checked_idx on public.pallos_checks (user_id, checked_at desc);
create index if not exists pallos_incidents_user_created_idx on public.pallos_incidents (user_id, created_at desc);

grant select, insert, update, delete on public.pallos_monitors to authenticated;
grant select, insert, update, delete on public.pallos_checks to authenticated;
grant select, insert, update, delete on public.pallos_incidents to authenticated;

drop policy if exists "Users manage their monitors" on public.pallos_monitors;
create policy "Users manage their monitors" on public.pallos_monitors
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage their checks" on public.pallos_checks;
create policy "Users manage their checks" on public.pallos_checks
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage their incidents" on public.pallos_incidents;
create policy "Users manage their incidents" on public.pallos_incidents
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
