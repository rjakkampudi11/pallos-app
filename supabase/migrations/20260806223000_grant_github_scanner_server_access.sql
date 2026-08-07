-- Explicitly allow Pallos's server-only Supabase role to use the GitHub scanner tables.
-- Browser users remain protected by RLS and never receive the server secret.
grant select, insert, update, delete on public.pallos_github_installations to service_role;
grant select, insert, update, delete on public.pallos_github_repositories to service_role;
grant select, insert, update, delete on public.pallos_code_scans to service_role;
grant select, insert, update, delete on public.pallos_code_findings to service_role;
