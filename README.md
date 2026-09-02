# Pallos Agent

Public outreach site plus an authenticated Pallos workspace for monitoring JSON API contracts and reviewing code findings.

Run `npm install`, copy `.env.example` to `.env.local`, and run `npm run dev`. Host-based routing serves the outreach site on `pallosagent.info` and the workspace on `pallosagent.com`.

The API monitor, authentication, Supabase persistence, incident email delivery, scheduled checks, deterministic GitHub scanner, pull-request summaries, dependency advisory checks, recent-history secret checks, finding review decisions, verified remediation records, automatic default-branch scans, GitHub scan history, and read-only Supabase catalog inspection are implemented features. Vercel, Stripe, and project panels explicitly marked as demo remain placeholders. See `docs/supabase-monitor-setup.md` and `docs/github-app-setup.md` for setup.

Connected repositories are checked automatically after a push reaches their default branch.
