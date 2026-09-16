# Pallos Agent — GitHub Marketplace listing draft

This copy is ready to paste into a free GitHub Marketplace listing after the Pallos GitHub App is public and the listing assets are prepared.

## Listing name

Pallos Agent

## Very short description

Plain-English security scans for AI-built GitHub projects.

## Short description

Find exposed secrets, weak authorization, risky routes, unsafe server/client boundaries, and Supabase access problems—then see the evidence and a practical fix direction.

## Full description

Pallos Agent gives founders, students, and developers a focused security second pass before launch.

Choose the repositories Pallos can read. It scans the selected source code for high-impact patterns common in JavaScript, TypeScript, Next.js, and Supabase projects, including:

- committed credential patterns and exposed secrets;
- weak admin, role, or ownership checks;
- sensitive server operations placed in browser-facing code;
- risky API route, webhook, CORS, and dynamic-execution patterns;
- permissive Supabase Row Level Security policies; and
- fixes that still need verification after a later scan.

Each result shows the affected file, the evidence Pallos found, why it matters, and a practical way to address it. Checks that Pallos cannot complete stay marked as untested instead of being counted as passes.

Pallos uses read-only repository contents and metadata for the repositories you select. It cannot push commits, change files, or merge code. You remain in control of every fix.

## Suggested category

Security

## Pricing plan

Free

## URLs

- Product: https://pallosagent.com
- Setup: https://pallosagent.com/login?mode=signup&next=/connections
- Free public scan: https://pallosagent.com/scan
- Security: https://pallosagent.com/security
- Privacy: https://pallosagent.com/privacy
- Terms: https://pallosagent.com/terms
- Support email: pallosagent@gmail.com

## Permissions explanation

- Repository contents: read-only, to analyze selected source files.
- Repository metadata: read-only, to identify the repository, branch, and commit being scanned.
- Pull requests or issues: only if enabled for posting a concise scan summary; do not request this permission until the feature is active and documented.
- Webhooks: push and pull-request events, to start an authorized rescan when selected code changes.

## Assets still required before submission

- App logo that follows GitHub's image requirements.
- Marketplace feature card.
- Two or more current product screenshots with no private repository data.
- A public GitHub App owned by the intended publisher.
- Working plan-change and cancellation webhook handling for the Marketplace listing.

## Submission note

Keep the first Marketplace version free and publicly available. A paid listing has additional publisher-verification, installation-count, billing, and event-handling requirements. Do not claim automatic fixes or complete vulnerability coverage; the current product is a read-only scanner with evidence and fix directions.
