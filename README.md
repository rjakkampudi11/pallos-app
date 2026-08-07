# Pallos Agent

Public outreach site plus an authenticated Pallos workspace for monitoring JSON API contracts and reviewing code findings.

Run `npm install`, copy `.env.example` to `.env.local`, and run `npm run dev`. Host-based routing serves the outreach site on `pallosagent.info` and the workspace on `pallosagent.com`.

The API monitor, authentication, Supabase persistence, incident email delivery, daily checks, deterministic read-only GitHub scanner, automatic default-branch scans, and GitHub scan history are real V1 features. Supabase, Vercel, Stripe, and demo project panels that are explicitly marked as demo remain placeholders. See `docs/supabase-monitor-setup.md` and `docs/github-app-setup.md` for setup.
