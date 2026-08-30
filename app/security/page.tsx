import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CheckCircle, Database, GithubLogo, Key, LockKey, ShieldCheck, Trash } from "@phosphor-icons/react/dist/ssr";

export const metadata: Metadata = {
  title: "Security at Pallos Agent",
  description: "How Pallos protects accounts, API monitor data, and connected GitHub repositories—and what its V1 security checks do not guarantee.",
  alternates: { canonical: "https://pallosagent.info/security" },
};

const protections = [
  { icon: LockKey, title: "Accounts", body: "Login sessions use secure, HTTP-only cookies. New accounts must verify their email, and sensitive actions are rate-limited." },
  { icon: Database, title: "Stored data", body: "Supabase Row Level Security separates account data. Private monitor header values are encrypted with AES-256-GCM before storage." },
  { icon: GithubLogo, title: "GitHub access", body: "Pallos requests read-only repository contents and metadata for repositories you select. Short-lived installation tokens are created when needed; permanent GitHub access tokens are not stored." },
  { icon: Key, title: "API monitoring", body: "Pallos makes server-side HTTPS requests, blocks local and private network destinations, caps response size and time, and never sends saved credentials to a different host." },
  { icon: Trash, title: "Your control", body: "You can disconnect GitHub and remove Pallos webhooks and scan records, or permanently delete your account and associated product data." },
  { icon: ShieldCheck, title: "Account history", body: "Login, connection, scan, monitor-change, and deletion events are recorded for review. IP addresses are hashed instead of stored as plain text." },
];

export default function SecurityPage() {
  return <main className="security-page"><header className="security-nav"><Link className="brand" href="/"><span className="brand-dot" />Pallos Agent</Link><Link href="/"><ArrowLeft />Back to Pallos</Link></header><section className="security-hero"><span>SECURITY AT PALLOS</span><h1>Useful access. Clear boundaries.</h1><p>Pallos is built to inspect the parts you choose without claiming more access—or more certainty—than the first version actually has.</p><div><CheckCircle weight="fill" />Last reviewed August 11, 2026</div></section><section className="security-grid">{protections.map(({ icon: Icon, title, body }) => <article key={title}><Icon /><h2>{title}</h2><p>{body}</p></article>)}</section><section className="security-limits"><div><span>HONEST LIMITS</span><h2>What Pallos does not promise</h2></div><div><p>Pallos V1 uses focused, deterministic checks. A clean result does not prove that an app is secure, compliant, or free from vulnerabilities.</p><p>Pallos does not modify repository files, deploy code, approve fixes automatically, or replace a professional penetration test or security review.</p><p>API monitoring compares JSON response structure and availability. It does not inspect every business rule, authorization path, or downstream service.</p></div></section><section className="security-contact"><ShieldCheck /><div><span>QUESTIONS OR REPORTS</span><h2>Tell us if something looks wrong.</h2><p>Send security and privacy questions to <a href="mailto:pallosagent@gmail.com">pallosagent@gmail.com</a>. Please do not include passwords, API keys, or customer data.</p></div></section><footer className="security-footer"><span>© 2026 Pallos Agent</span><div><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></div></footer></main>;
}
