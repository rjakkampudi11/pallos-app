alter table public.pallos_code_scans
  add column if not exists trigger_type text not null default 'manual',
  add column if not exists branch_ref text,
  add column if not exists github_delivery_id text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'pallos_code_scans_trigger_type_check'
      and conrelid = 'public.pallos_code_scans'::regclass
  ) then
    alter table public.pallos_code_scans
      add constraint pallos_code_scans_trigger_type_check
      check (trigger_type in ('manual', 'push'));
  end if;
end $$;

create unique index if not exists pallos_code_scans_delivery_idx
  on public.pallos_code_scans (user_id, github_delivery_id)
  where github_delivery_id is not null;

create index if not exists pallos_code_scans_user_started_idx
  on public.pallos_code_scans (user_id, started_at desc);
