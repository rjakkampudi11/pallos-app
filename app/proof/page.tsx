import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle, GithubLogo, ShieldCheck, WarningCircle } from "@phosphor-icons/react/dist/ssr";

export const metadata: Metadata = {
  title: "Proof Lab | Pallos",
  description: "Reproducible Pallos static-code scans on intentionally vulnerable public training repositories.",
};

type Case = {
  name: string;
  source: string;
  commit: string;
  label: string;
  before: { score: number; grade: string; coverage: number };
  signals: string[];
  files: string[];
  fix: string;
  after: { score: number; grade: string; coverage: number };
  limit: string;
};

const cases: Case[] = [
  {
    name: "Wobblr",
    source: "https://github.com/Anic888/predeploy-audit-nextjs/tree/902eef563c12edcff0aceb51fcb9c9dfc241b870/demo-vulnerable-app/wobblr",
    commit: "902eef5",
    label: "Deliberately vulnerable Next.js + Supabase + Stripe training app",
    before: { score: 39, grade: "Critical Risk", coverage: 77 },
    signals: ["Credential-shaped demo values in source", "Unprotected AI route", "Webhook without visible signature verification", "Supabase service-role key referenced from client code"],
    files: [".env.example", "app/api/ai/describe/route.ts", "app/api/stripe/webhook/route.ts", "app/dashboard/page.tsx"],
    fix: "Move privileged values and work to server-only code; verify the provider webhook signature against the raw body; add appropriate authentication, rate limits, and an output cap to the AI route; rotate any real credential that was ever exposed.",
    after: { score: 95, grade: "Strong", coverage: 77 },
    limit: "The repository explicitly uses fake demo credentials. Pallos detected credential-shaped strings; this is not evidence that a live key was usable. The after result is a controlled remediation re-scan, not a claim that every runtime path was penetration-tested.",
  },
  {
    name: "OWASP NodeGoat",
    source: "https://github.com/OWASP/NodeGoat/tree/c5cb68a7084e4ae7dcc60e6a98768720a81841e8",
    commit: "c5cb68a",
    label: "OWASP’s intentionally insecure Node.js training application",
    before: { score: 84, grade: "Moderate Risk", coverage: 50 },
    signals: ["Dynamic code execution in contribution calculations"],
    files: ["app/routes/contributions.js:31"],
    fix: "Replace dynamic execution with explicit numeric parsing and validation. In this case, use a parser such as Number.parseInt only after validating the input’s allowed format and range.",
    after: { score: 95, grade: "Strong", coverage: 50 },
    limit: "This focused static scan found one applicable dynamic-execution signal. It does not claim NodeGoat is otherwise safe—its purpose is to teach many vulnerability classes, some outside Pallos’s current checks.",
  },
  {
    name: "Supabase Security Labs",
    source: "https://github.com/elamilutinovic-vibePep/supabase-security-labs/tree/38889900a5465599e967a5a207b072837b824259",
    commit: "3888990",
    label: "Public lab intentionally demonstrating broken Supabase RLS",
    before: { score: 69, grade: "High Risk", coverage: 62 },
    signals: ["RLS policies with an unconditional using (true) expression"],
    files: ["rls-broken-lab/supabase/migrations/20260304090100__lab_broken_rls_and_storage.sql:24"],
    fix: "Replace broad policies with ownership or membership checks tied to auth.uid(), then test reads and writes with at least two accounts. The exact policy must match the application’s schema and authorization model.",
    after: { score: 95, grade: "Strong", coverage: 65 },
    limit: "The controlled re-scan confirms the broad-policy pattern is gone. It does not prove the replacement policy is correct for every user or query; two-user runtime tests are still required.",
  },
];

export default function ProofLabPage() {
  return <main className="proof-page">
    <header className="proof-header"><nav className="proof-nav"><Link href="/" className="proof-brand"><span />Pallos</Link><Link href="/scan" className="proof-nav-cta">Scan a public repo <ArrowRight weight="bold" /></Link></nav></header>
    <section className="proof-hero">
      <p className="proof-eyebrow"><ShieldCheck weight="fill" />Pallos Proof Lab</p>
      <h1>Real detections. Public source. Clear limits.</h1>
      <p>These are reproducible scans of intentionally vulnerable public training repositories—not customer incidents and not security guarantees. Each source link is pinned to a commit, every result says what Pallos checked, and every “after” result is a controlled re-scan.</p>
      <div className="proof-principles"><span><CheckCircle weight="fill" />Static source review only</span><span><CheckCircle weight="fill" />No credentials stored or used</span><span><CheckCircle weight="fill" />No runtime attack performed</span></div>
    </section>
    <section className="proof-cases" aria-label="Reproducible scan cases">
      {cases.map((item, index) => <article className="proof-case" key={item.name}>
        <div className="proof-case-top"><div><p className="proof-case-number">CASE {String(index + 1).padStart(2, "0")}</p><h2>{item.name}</h2><p>{item.label}</p></div><a href={item.source} target="_blank" rel="noreferrer" className="proof-source"><GithubLogo weight="fill" />Source at {item.commit}</a></div>
        <div className="proof-score-grid"><div className="proof-before"><span>Original scan</span><strong>{item.before.score}<small>/100</small></strong><b>{item.before.grade}</b><p>{item.before.coverage}% applicable-check coverage</p></div><div className="proof-arrow">→</div><div className="proof-after"><span>Controlled re-scan</span><strong>{item.after.score}<small>/100</small></strong><b>{item.after.grade}</b><p>{item.after.coverage}% applicable-check coverage</p></div></div>
        <div className="proof-detail-grid"><section><h3><WarningCircle weight="fill" />What Pallos flagged</h3><ul>{item.signals.map((signal) => <li key={signal}>{signal}</li>)}</ul><p className="proof-files">Evidence: {item.files.join(" · ")}</p></section><section><h3><CheckCircle weight="fill" />Fix direction</h3><p>{item.fix}</p></section></div>
        <p className="proof-limit"><b>Important:</b> {item.limit}</p>
      </article>)}
    </section>
    <section className="proof-method"><p className="proof-eyebrow">How to read this</p><h2>A score is a summary, not a promise.</h2><p>Pallos reports only the checks it can apply from the available repository source. Untested areas remain untested, and a clean re-scan means the specific static pattern was no longer found—not that the app has no security risk.</p><Link href="/methodology">Read the methodology <ArrowRight weight="bold" /></Link></section>
    <section className="proof-cta"><p>Ready to check your own code?</p><h2>Get the evidence before you launch.</h2><Link href="/scan" className="proof-button">Scan a public repo — no account <ArrowRight weight="bold" /></Link></section>
  </main>;
}
