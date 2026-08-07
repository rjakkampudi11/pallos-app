alter table public.pallos_monitors
  add column if not exists schedule_frequency text not null default 'manual',
  add column if not exists next_check_at timestamptz,
  add column if not exists email_alerts boolean not null default true;

do $$
begin
  alter table public.pallos_monitors
    add constraint pallos_monitors_schedule_frequency_check
    check (schedule_frequency in ('manual', 'hourly', 'six_hours', 'daily'));
exception
  when duplicate_object then null;
end $$;

alter table public.pallos_incidents
  add column if not exists alert_sent_at timestamptz,
  add column if not exists alert_recipient text,
  add column if not exists alert_error text;

create index if not exists pallos_monitors_due_check_idx
  on public.pallos_monitors (next_check_at)
  where schedule_frequency <> 'manual';

