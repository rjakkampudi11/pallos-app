import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BracketsCurly, CheckCircle, Flask, Info, LockKey, Warning } from "@phosphor-icons/react/dist/ssr";

const trainingUrl = "https://pallosagent.com/api/training/profile";
const tryUrl = `https://pallosagent.info/?scanUrl=${encodeURIComponent(trainingUrl)}#free-scan`;
const changes = [
  { kind: "Type changed", path: "$.user_id", detail: "string → number", serious: true },
  { kind: "Type changed", path: "$.plan_name", detail: "string → object", serious: true },
  { kind: "Missing field", path: "$.subscription_status", detail: "Field removed", serious: true },
  { kind: "New field", path: "$.plan_name.code", detail: "string", serious: false },
  { kind: "New field", path: "$.plan_name.label", detail: "string", serious: false },
  { kind: "New field", path: "$.deployment_region", detail: "string", serious: false },
];

export const metadata: Metadata = {
  metadataBase: new URL("https://pallosagent.com"),
  title: "Simulated API Change Report | Pallos Agent",
  description: "A read-only Pallos demonstration of HTTP monitoring, missing fields, new fields, and JSON type changes.",
  alternates: { canonical: "/demo-report" },
  robots: { index: false, follow: false },
};

export default function DemoReportPage() {
  return <main className="public-report-page">
    <header className="public-report-nav"><Link href="https://pallosagent.info" className="public-report-brand"><span />Pallos Agent</Link><Link href={tryUrl} className="public-report-nav-cta">Try the safe demo <ArrowRight weight="bold" /></Link></header>
    <section className="public-report-hero">
      <div className="public-report-simulated"><Flask weight="fill" />SIMULATED DEMO — NOT A REAL CUSTOMER INCIDENT</div>
      <p className="public-report-kicker">PUBLIC · READ-ONLY REPORT</p><h1>See exactly what changed in an API response.</h1>
      <p>This report uses Pallos’s purpose-built training endpoint. The changes below were deliberately created to demonstrate what Pallos detects—they were not found in anyone else’s API.</p>
      <div className="public-report-actions"><Link href={tryUrl} className="public-report-primary">Try this endpoint, then use yours <ArrowRight weight="bold" /></Link><a href="#detected-changes" className="public-report-secondary">View the detected changes</a></div>
      <small>No account needed for the first scan. Public HTTPS JSON endpoints only.</small>
    </section>
    <section className="public-report-shell">
      <article className="public-report-summary">
        <div className="public-report-card-head"><div><span>DEMO RESULT</span><h2>Training profile API</h2></div><em><Warning weight="fill" />6 changes</em></div>
        <div className="public-report-metrics"><div><span>HTTP STATUS</span><strong>200</strong><small>The endpoint still responded</small></div><div><span>RESPONSE TIME</span><strong>112 ms</strong><small>Completed successfully</small></div><div><span>SEVERITY</span><strong>High</strong><small>3 serious changes</small></div><div><span>JSON ROOT</span><strong>Object</strong><small>Structure compared</small></div></div>
        <div className="public-report-source"><BracketsCurly /><div><span>BASELINE SOURCE</span><code>{trainingUrl}</code></div><CheckCircle weight="fill" /></div>
      </article>
      <div className="public-report-grid" id="detected-changes">
        <article className="public-report-changes"><div className="public-report-card-head"><div><span>CONTRACT COMPARISON</span><h2>Detected changes</h2></div><em>Baseline → simulated fault</em></div><div className="public-change-list">{changes.map((change) => <div className={change.serious ? "serious" : "informational"} key={change.path}><span>{change.kind}</span><code>{change.path}</code><strong>{change.detail}</strong></div>)}</div></article>
        <aside className="public-report-incident"><span>INCIDENT CREATED</span><div className="public-incident-badge">HIGH</div><h2>Response contract changed</h2><p>Pallos opened an incident because required fields disappeared and existing fields changed type.</p><div><CheckCircle weight="fill" /><span><b>Clear evidence</b>Field paths show where the contract moved.</span></div><div><LockKey weight="fill" /><span><b>Values stay private</b>This report shows structure, not response contents.</span></div></aside>
      </div>
      <article className="public-report-explainer"><Info weight="fill" /><div><span>WHAT THIS PROVES</span><h2>Pallos can compare two JSON response shapes and explain the difference.</h2><p>It does not prove that an API is secure or that every business rule works. It gives builders an early warning when availability or response structure changes.</p></div></article>
      <section className="public-report-final-cta"><span>TRY IT WITHOUT SHARING PRIVATE DATA</span><h2>Run the safe demo, or replace the URL with your own public staging endpoint.</h2><p>The training URL will already be filled in. Pallos’s free scan displays status and structure without showing response values.</p><Link href={tryUrl} className="public-report-primary">Open the free scanner <ArrowRight weight="bold" /></Link></section>
    </section>
    <footer className="public-report-footer"><span>© 2026 Pallos Agent</span><a href="mailto:pallosagent@gmail.com">pallosagent@gmail.com</a></footer>
  </main>;
}
