# Pallos monitor Supabase setup

The monitor uses Supabase only from server-side API routes. Do not expose the secret key with a `NEXT_PUBLIC_` prefix.

## Required values

- `SUPABASE_URL`: Project Settings → Data API → Project URL.
- `SUPABASE_SECRET_KEY`: Project Settings → API Keys → Secret key. A legacy `service_role` key also works through the `SUPABASE_SERVICE_ROLE_KEY` variable.

Add the values to Vercel for Production, Preview, and Development. For local work, place them in `.env.local`.

## Create the tables

Apply `supabase/migrations/20260804010000_create_pallos_monitor.sql` to the selected Supabase project. The migration creates:

- `pallos_monitors`
- `pallos_checks`
- `pallos_incidents`

All three tables have Row Level Security enabled and no browser-facing policies. The server secret is the only application credential permitted to access them in V1.

## Verify

1. Open `/monitor` on `pallosagent.com`.
2. Capture the healthy training endpoint as the baseline.
3. Load the supplied fault URL into the check URL field and run a check.
4. Confirm that the check is stored and an incident appears when a serious schema or HTTP change is returned.
