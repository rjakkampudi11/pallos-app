import Link from "next/link";
import { LegalShell } from "../../components/legal-shell";

export const metadata = { title: "AI Code Security Checklist Before Launch | Pallos", description: "A practical security checklist for apps built with Cursor, Lovable, Replit, Bolt, v0, Claude Code, or Codex.", alternates: { canonical: "/guides/ai-code-security-checklist" } };

const checklist = [
  ["Remove exposed secrets", "Search browser-delivered code, commits, logs, and screenshots for API keys, service-role keys, database URLs with credentials, and access tokens. Rotate a secret if it was ever public—deleting it is not enough."],
  ["Enforce authorization on the server", "Signing in proves identity, not permission. Every admin, billing, export, delete, and account-management route should independently verify the user and required role on the server."],
  ["Lock down database access", "Enable Row Level Security where appropriate, test policies as multiple user types, and make sure public or anonymous clients cannot read or change another user’s records."],
  ["Keep private work off the client", "Payment operations, privileged database calls, secret-backed AI requests, and admin actions belong behind server routes. Return only fields the browser actually needs."],
  ["Validate inputs and webhooks", "Validate request shapes, reject unexpected fields, verify webhook signatures, and rate limits, and make retries safe so one event cannot create duplicate actions."],
  ["Check dependencies and deployment settings", "Review known dependency advisories, production environment variables, CORS rules, cookie flags, error messages, source maps, and preview deployments."],
  ["Test the fix", "Re-run the exact risky path after changing code. Confirm the old exploit or exposure is gone without weakening authentication, breaking normal users, or leaking details through a new response."],
];

export default function Page() { return <LegalShell eyebrow="PRACTICAL GUIDE" title="AI code security checklist before launch" lead="Use this checklist after building with an AI coding tool and before connecting real customers, payments, or sensitive data.">
  <section className="legal-callout"><h2>Start with the highest-impact failures</h2><p>AI-generated code is still ordinary code. The most urgent risks usually involve exposed credentials, missing server-side authorization, overly broad database access, and trusted inputs that an attacker can control.</p></section>
  {checklist.map(([title, body], index) => <section key={title}><h2>{index + 1}. {title}</h2><p>{body}</p></section>)}
  <section><h2>What an automated scanner cannot prove</h2><p>No scanner can verify every business rule or guarantee an app is secure. Combine automated checks with manual role testing, backups, staging, operational monitoring, and professional review when the impact warrants it.</p><p><Link href="/methodology">See exactly what Pallos checks</Link> or <Link href="/scan">scan a public GitHub repository</Link>.</p></section>
</LegalShell>; }
