import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CheckCircle, Eye, GitBranch, ShieldWarning } from "@phosphor-icons/react/dist/ssr";

export const metadata: Metadata = {
  title: "How the Pallos AI Code Security Scanner Works",
  description: "See what Pallos checks in GitHub projects across cost, reliability, security, privacy, and recovery—and the known limits of its deterministic scanner.",
  alternates: { canonical: "https://pallosagent.com/methodology" },
};

const supported = [
  "Committed credentials, tokens, and browser-exposed secrets",
  "Client/server secret-boundary mistakes",
  "Admin routes missing explicit authorization checks",
  "Credentialed CORS and script-readable session cookies",
  "Unsigned Stripe webhooks and risky dynamic code execution",
  "Common AI-endpoint abuse controls and Supabase policy patterns",
  "Visible timeouts for server-side external requests",
  "Visible data minimization before AI request bodies are forwarded",
  "Destructive database changes that need a tested recovery path",
  "Installed dependency advisories when a supported lockfile is present",
];

export default function MethodologyPage() {
  return <main className="methodology-page"><header className="security-nav"><Link className="methodology-brand" href="/"><span />Pallos</Link><Link href="/"><ArrowLeft />Back to Pallos</Link></header><section className="methodology-hero"><span>SCANNING METHODOLOGY</span><h1>What Pallos checks—and what it cannot prove.</h1><p>Pallos uses focused, deterministic rules to review supported code and configuration. Every result separates verified signals from checks that could not be completed.</p></section><section className="methodology-summary"><article><Eye /><h2>Read-only review</h2><p>Pallos reads only the repositories you select. It does not edit, push, merge, or deploy code.</p></article><article><GitBranch /><h2>Evidence first</h2><p>Findings point to the affected file and explain the detected pattern without exposing saved secrets.</p></article><article><ShieldWarning /><h2>Honest coverage</h2><p>Untested checks stay marked unknown. A clean scan is not presented as proof that an application is secure.</p></article></section><section className="methodology-content"><div><span>CRSPR LITE</span><h2>Cost, reliability, security, privacy, and recovery</h2><p>Pallos labels each release-risk area separately. A static code scan can identify supported signals, but it cannot prove live costs, uptime, consent, or restoration readiness.</p></div><div className="methodology-definitions"><p><b>Cost</b> reviews supported AI endpoints for guardrails that limit abusive or unexpectedly expensive use.</p><p><b>Reliability</b> reviews visible timeout handling around external server-side requests.</p><p><b>Security</b> reviews supported access, secret, webhook, database, and dependency patterns.</p><p><b>Privacy</b> reviews visible AI request-body minimization—not whether every data flow is lawful or disclosed.</p><p><b>Recovery</b> flags destructive database operations for backup, rollback, and restoration review.</p></div></section><section className="methodology-content"><div><span>SUPPORTED CHECKS</span><h2>Current scanner coverage</h2><p>The private beta is primarily designed for JavaScript, TypeScript, Next.js, Supabase, and common surrounding services.</p></div><ul>{supported.map((item) => <li key={item}><CheckCircle weight="fill" />{item}</li>)}</ul></section><section className="methodology-content"><div><span>UNDERSTANDING RESULTS</span><h2>Risk, score, and coverage measure different things</h2></div><div className="methodology-definitions"><p><b>Risk level</b> follows the most serious verified issue, so one high-severity authorization problem can make the result High Risk.</p><p><b>Score</b> summarizes passed and failed checks. It is not a certification.</p><p><b>Coverage</b> shows the percentage of available checks Pallos could actually run. Unknown checks do not silently count as passed.</p></div></section><section className="methodology-limits"><span>KNOWN LIMITS</span><h2>Pallos is a focused second pass.</h2><p>It does not replace penetration testing, manual code review, compliance work, or testing every business rule and authorization path. Results depend on the files and integrations available during a scan.</p><div><b>Beta changelog · September 2026</b><p>Added CRSPR Lite release-risk coverage, clearer score definitions, explicit coverage reporting, capped result lists, dependency advisory checks, and verified-fix history.</p></div></section><footer className="security-footer"><span>© 2026 Pallos</span><div><Link href="/security">Security</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></div></footer></main>;
}
