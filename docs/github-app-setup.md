# Pallos read-only GitHub App setup

Pallos uses a GitHub App so customers can choose individual repositories and grant only read-only access. Pallos does not store a permanent GitHub token and never writes to a repository.

## GitHub App settings

- GitHub App name: `Pallos Agent` (or another available name)
- Homepage URL: `https://pallosagent.com`
- Callback URL: `https://pallosagent.com/api/github/callback`
- Setup URL: `https://pallosagent.com/connections`
- Request user authorization during installation: enabled
- Webhooks: disabled for V1
- Repository permissions → Contents: Read-only
- Repository permissions → Metadata: Read-only (GitHub includes this automatically)
- Where can this GitHub App be installed?: Any account

Generate one private key after creating the app. Put the full PEM value into Vercel; do not commit it to this project.

## Vercel Production variables

- `GITHUB_APP_ID`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET` (Sensitive)
- `GITHUB_PRIVATE_KEY` (Sensitive)
- `GITHUB_APP_SLUG`

After adding them, redeploy Production. Then install the app on a test repository and open `/connections`.

## Database migration

Run `supabase/migrations/20260806220000_add_github_scanner.sql` in the Supabase SQL Editor before connecting a repository.

If the original migration was run before the explicit `service_role` grants were added, also run `supabase/migrations/20260806223000_grant_github_scanner_server_access.sql`.
