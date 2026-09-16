import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CheckCircle, Database, GithubLogo, LockKey, ShieldCheck, Trash } from "@phosphor-icons/react/dist/ssr";

export const metadata: Metadata = {
  title: "Security at Pallos",
  description: "How Pallos protects accounts, scan data, and connected GitHub repositories—and what its security checks do not guarantee.",
  alternates: { canonical: "https://pallosagent.com/security" },
};

const protections = [
  { icon: LockKey, title: "Accounts", body: "Login sessions use secure, HTTP-only cookies. New accounts must verify their email, and sensitive actions are rate-limited." },
  { icon: Database, title: "Stored data", body: "Supabase Row Level Security separates account data. Pallos stores findings and scan metadata, not complete repository source files." },
  { icon: GithubLogo, title: "GitHub access", body: "Pallos requests read-only repository contents and metadata for repositories you select. Short-lived installation tokens are created when needed; permanent GitHub access tokens are not stored." },
  { icon: ShieldCheck, title: "Scan handling", body: "Repository source is fetched only for requested scans. Evidence is limited to what is needed to explain a finding, and sensitive values are redacted." },
  { icon: Trash, title: "Your control", body: "You can disconnect GitHub and remove Pallos webhooks and scan records, or permanently delete your account and associated product data." },
  { icon: ShieldCheck, title: "Account history", body: "Login, repository connection, scan, and deletion events are recorded for review. IP addresses are hashed instead of stored as plain text." },
];

export default function SecurityPage() {
  return <main className="security-page"><header className="security-nav"><Link className="brand" href="/"><span className="brand-dot" />Pallos</Link><Link href="/"><ArrowLeft />Back to Pallos</Link></header><section className="security-hero"><span>SECURITY AT PALLOS</span><h1>How Pallos handles access and scan data.</h1><p>Pallos inspects only the repositories you authorize and keeps the limits of each check visible.</p><div><CheckCircle weight="fill" />Last reviewed September 16, 2026</div></section><section className="security-grid">{protections.map(({ icon: Icon, title, body }) => <article key={title}><Icon /><h2>{title}</h2><p>{body}</p></article>)}</section><section className="security-limits"><div><span>HONEST LIMITS</span><h2>What Pallos does not promise</h2></div><div><p>Pallos uses focused, deterministic checks. A clean result does not prove that an app is secure, compliant, or free from vulnerabilities.</p><p>Pallos does not modify repository files, deploy code, approve fixes automatically, or replace a professional penetration test or security review.</p><p>Automated code checks cannot inspect every business rule, authorization path, deployment setting, or downstream service. Review important findings and test fixes before launch.</p></div></section><section className="security-contact"><ShieldCheck /><div><span>QUESTIONS OR REPORTS</span><h2>Report a security or privacy concern.</h2><p>Send security and privacy questions to <a href="mailto:pallosagent@gmail.com">pallosagent@gmail.com</a>. Please do not include passwords, API keys, or customer data.</p></div></section><footer className="security-footer"><span>© 2026 Pallos</span><div><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></div></footer></main>;
}
