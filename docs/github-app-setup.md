# Pallos read-only GitHub App setup

Pallos uses a GitHub App so customers can choose individual repositories. Repository contents remain read-only. The optional Issues permission is used only to publish advisory pull-request review summaries; Pallos never pushes or merges code.

## GitHub App settings

- GitHub App name: `Pallos Agent` (or another available name)
- Homepage URL: `https://pallosagent.com`
- Callback URL: `https://pallosagent.com/api/github/callback`
- Setup URL: `https://pallosagent.com/connections`
- Request user authorization during installation: enabled
- Webhooks: active (use the App webhook, or a push-only repository webhook as a fallback)
- Webhook URL: `https://pallosagent.com/api/github/webhooks`
- Subscribe to events: Push and Pull request
- Repository permissions → Contents: Read-only
- Repository permissions → Metadata: Read-only (GitHub includes this automatically)
- Repository permissions → Issues: Read and write (required only for pull-request summary comments)
- Where can this GitHub App be installed?: Any account

Generate one private key after creating the app. Put the full PEM value into Vercel; do not commit it to this project.

## Vercel Production variables

- `GITHUB_APP_ID`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET` (Sensitive)
- `GITHUB_PRIVATE_KEY` (Sensitive)
- `GITHUB_APP_SLUG`
- `GITHUB_WEBHOOK_SECRET` (Sensitive; use the same value in GitHub)

After adding them, redeploy Production. Then install the app on a test repository and open `/connections`.

## Database migration

Run `supabase/migrations/20260806220000_add_github_scanner.sql` and `supabase/migrations/20260807190000_add_github_push_scans.sql` in the Supabase SQL Editor before connecting a repository.

Then run `supabase/migrations/20260901120000_security_core_expansion.sql` for review decisions, verified remediation records, pull-request scans, and Supabase inspection connections.

If the original migration was run before the explicit `service_role` grants were added, also run `supabase/migrations/20260806223000_grant_github_scanner_server_access.sql`.
