alter table public.pallos_checks add column if not exists assessment jsonb;
alter table public.pallos_code_scans add column if not exists assessment jsonb;

comment on column public.pallos_checks.assessment is 'Versioned passive security assessment derived from the saved check; contains no response values.';
comment on column public.pallos_code_scans.assessment is 'Versioned security assessment derived from deterministic repository findings and scan coverage.';
