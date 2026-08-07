# Pallos Agent design QA

## Source and scope

- Source: user-supplied Google Doc tabs `.com errors` and `.info errors`, including screenshots.
- Products: `pallosagent.com` sandbox workspace and `pallosagent.info` outreach site.
- Brand direction: premium and spacious, current navy/cyan palette, clear language for people building with AI, no firewall framing.

## Repairs verified

- `.info`: sticky top navigation, readable typography, extended landing content, legal pages, exact contact identities, direct social links, caret FAQ controls, conditional Other-tool field, new-tab workspace link, modal fix prompts, and inline rescan status.
- `.com`: first-run guidance, distinct URL paths, workspace/profile/notification menus, mobile sidebar, demo scan workflow, finding filters, fix-prompt modal, run details, CSV export, settings, contact view, and blank-field sandbox login.
- `.com` settings: separate General, Appearance, Account, and Connectors sections; device-local theme, accent, density, and reduced-motion preferences; sandbox login-detail and session controls; connector status and setup actions.
- `.com` API monitor: real endpoint baseline capture, manual checks, response-contract diffs, stored check history, serious incident creation, Supabase setup state, and responsive monitoring workspace.
- SEO: canonical metadata, Open Graph/Twitter image, SoftwareApplication and FAQ structured data, sitemap, robots policy, apex redirects, and noindex protection for the sandbox.

## QA matrix

- Desktop: outreach hero and sandbox home visually inspected on production.
- Mobile: sandbox home and navigation inspected at 390 x 844.
- Interaction checks: FAQ, Other-tool reveal, prepare prompt, rescan, workspace menu, notifications, demo scan routing, finding prompt, and login.
- Automated checks: ESLint clean; production Next.js build clean.
- Production checks: both apex domains return expected pages; `www` redirects; legal pages, sitemap, robots, canonicals, social image, and `.com` noindex headers verified.

## Current prototype boundaries

- Workspace findings and scans intentionally use illustrative data.
- The login accepts blank fields intentionally for sandbox testing.
- Waitlist delivery requires the configured Google Apps Script URL and shared secret in Vercel environment variables.
