"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowRight, Check, Copy, List, X } from "@phosphor-icons/react";
import { FreeApiScan } from "@/app/components/free-api-scan";

const checks = [
  ["Exposed secrets", "API keys included in browser-accessible code"],
  ["Access control", "Admin routes missing role validation"],
  ["Database permissions", "Supabase policies allowing overly broad access"],
  ["Client/server boundaries", "Sensitive operations inside client components"],
  ["API authorization", "Endpoints missing authentication or permission checks"],
  ["Incomplete fixes", "Previously identified risks that still appear unresolved"],
];

const findings = [
  { severity: "Critical", title: "Exposed Supabase service key", file: "src/lib/supabase-client.ts", line: "14", evidence: "The Supabase service role key appears in client-accessible code.", impact: "This key may bypass row-level security rules and allow privileged database access.", fix: "Move the service role key to a server-only environment variable and rotate the exposed credential." },
  { severity: "High", title: "Missing authorization check", file: "app/api/admin/users/route.ts", line: "32", evidence: "The route verifies authentication but does not verify whether the requester has an admin role.", impact: "Any authenticated user may be able to access administrative functionality.", fix: "Check the user role on the server before returning privileged data." },
  { severity: "Review", title: "Sensitive work in a client component", file: "components/payment-settings.tsx", line: "21", evidence: "A privileged operation is called from code that runs in the browser.", impact: "Browser code can be inspected or changed by the person using it.", fix: "Move the privileged operation behind an authenticated server route and return only the fields the interface needs." },
];

const steps = [
  ["01", "Connect or submit a project", "Use a public source or authorize read-only repository access."],
  ["02", "Pallos reviews security-sensitive code", "The scan checks secrets, authentication, authorization, routes, database access, and client/server boundaries."],
  ["03", "Review findings", "Each finding includes severity, file location, explanation, and suggested remediation."],
  ["04", "Rescan", "Run another scan after changes to see whether the issue is still present."],
];

const trustRows = [
  ["Repository permissions", "Read-only contents and metadata for repositories you select"],
  ["Automatic changes", "Pallos does not modify, push, merge, or deploy your code"],
  ["GitHub credentials", "Short-lived installation tokens are created when needed; permanent access tokens are not stored"],
  ["Code retention", "Repository source is fetched for scanning; Pallos stores findings and scan metadata, not complete source files"],
  ["Scan results", "Findings and scan records stay with your account until you disconnect the repository or delete your Pallos data"],
  ["Revoking access", "Disconnect in Pallos and revoke the app through GitHub at any time"],
  ["Security contact", "pallosagent@gmail.com"],
];

const tools = ["Cursor", "Claude", "ChatGPT", "Lovable", "Bolt", "Replit", "GitHub Copilot"];
type SubmitState = "idle" | "sending" | "success" | "error";
type RescanState = "idle" | "running" | "complete";

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeFinding, setActiveFinding] = useState(1);
  const [promptOpen, setPromptOpen] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);
  const [rescanState, setRescanState] = useState<RescanState>("idle");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [submitMessage, setSubmitMessage] = useState("");
  const [otherTool, setOtherTool] = useState(false);
  const finding = findings[activeFinding];
  const fixPrompt = `Review ${finding.file}:${finding.line} for: ${finding.title}. ${finding.fix} Keep the change minimal, explain what changed, and include a verification checklist. Do not expose secrets or weaken authorization.`;

  async function copyPrompt() {
    await navigator.clipboard.writeText(fixPrompt);
    setPromptCopied(true);
    window.setTimeout(() => setPromptCopied(false), 1800);
  }

  function queueRescan() {
    if (rescanState === "running") return;
    setRescanState("running");
    window.setTimeout(() => setRescanState("complete"), 1300);
  }

  async function submitWaitlist(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitState("sending");
    setSubmitMessage("");
    const form = event.currentTarget;
    const body = Object.fromEntries(new FormData(form).entries());
    try {
      const response = await fetch("/api/waitlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "We could not save your request.");
      form.reset();
      setOtherTool(false);
      setSubmitState("success");
      setSubmitMessage("You are on the tester list. We will only email you about Pallos testing and important product updates.");
    } catch (error) {
      setSubmitState("error");
      setSubmitMessage(error instanceof Error ? error.message : "We could not save your request.");
    }
  }

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", "@id": "https://pallosagent.com/#organization", name: "Pallos", url: "https://pallosagent.com", logo: "https://pallosagent.com/pallos-icon.svg", email: "pallosagent@gmail.com" },
      { "@type": "WebSite", "@id": "https://pallosagent.com/#website", name: "Pallos", url: "https://pallosagent.com", publisher: { "@id": "https://pallosagent.com/#organization" }, inLanguage: "en-US" },
      { "@type": "SoftwareApplication", name: "Pallos", applicationCategory: "SecurityApplication", operatingSystem: "Web", url: "https://pallosagent.com", description: "Security checks for AI-built JavaScript, TypeScript, Next.js, and Supabase applications.", offers: { "@type": "Offer", price: "0", priceCurrency: "USD" } },
    ],
  };

  return <main className="pallos-home" id="top">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />

    <header className="pallos-header"><nav className="pallos-shell" aria-label="Main navigation"><Link className="pallos-brand" href="#top"><Image src="/pallos-icon.svg" alt="" width={24} height={24} />Pallos</Link><div className={`pallos-nav-links ${menuOpen ? "open" : ""}`}><a href="#checks" onClick={() => setMenuOpen(false)}>Product</a><a href="#how" onClick={() => setMenuOpen(false)}>How It Works</a><Link href="/methodology" onClick={() => setMenuOpen(false)}>Methodology</Link><Link href="/security" onClick={() => setMenuOpen(false)}>Security</Link></div><div className="pallos-nav-actions"><Link href="/login">Sign In</Link><Link className="pallos-button primary" href="/scan">Scan a Project</Link></div><button className="pallos-menu" aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X /> : <List />}</button></nav></header>

    <div id="main-content">
      <section className="pallos-hero pallos-shell"><div className="pallos-hero-copy"><p className="pallos-label">DEVELOPER SECURITY SCANNER</p><h1>Security checks for AI-built apps.</h1><p>Pallos reviews JavaScript, TypeScript, Next.js, and Supabase projects for exposed secrets, weak access controls, unsafe routes, and other common launch-time security mistakes.</p><div className="pallos-actions"><Link className="pallos-button primary" href="/scan">Scan a project <ArrowRight /></Link><a className="pallos-button secondary" href="#free-scan">Try the safe demo</a></div><div className="pallos-trust-line">Read-only access <i /> No automatic fixes <i /> File-level findings <i /> You control every change</div></div><article className="hero-finding" aria-label="Example Pallos finding"><div className="finding-window"><span>pallos / scan-result</span><span>SCAN 0042</span></div><div className="finding-severity critical">CRITICAL</div><h2>Exposed Supabase service key</h2><code>src/lib/supabase-client.ts:14</code><p>The Supabase service role key appears in client-accessible code.</p><div className="hero-code" aria-label="Code evidence"><span>12&nbsp;&nbsp; import &#123; createClient &#125; from &quot;@supabase/supabase-js&quot;</span><span>13</span><strong>14&nbsp;&nbsp; const admin = createClient(url, serviceRoleKey)</strong></div><div className="finding-explanation"><section><span>WHY THIS MATTERS</span><p>This key may bypass row-level security rules and allow privileged database access.</p></section><section><span>SUGGESTED FIX</span><p>Move the service role key to a server-only environment variable and rotate the exposed credential.</p></section></div></article></section>

      <section className="pallos-section pallos-shell" id="checks"><div className="section-head"><div><p className="pallos-label">COVERAGE</p><h2>What Pallos checks</h2></div><p>Focused checks for security mistakes common in fast-moving JavaScript applications.</p></div><div className="checks-table" role="table" aria-label="What Pallos checks"><div className="checks-row checks-header" role="row"><span role="columnheader">Check</span><span role="columnheader">Example</span></div>{checks.map(([check, example]) => <div className="checks-row" role="row" key={check}><strong role="cell">{check}</strong><span role="cell">{example}</span></div>)}</div></section>

      <FreeApiScan />

      <section className="pallos-section pallos-shell finding-demo" id="finding"><div className="section-head"><div><p className="pallos-label">REAL FINDING · REAL CONTEXT</p><h2>What a Pallos finding looks like</h2></div><p>Select an example to review the evidence and next step.</p></div><div className="finding-selector">{findings.map((item, index) => <button className={activeFinding === index ? "active" : ""} onClick={() => { setActiveFinding(index); setRescanState("idle"); }} key={item.title}><span className={item.severity.toLowerCase()}>{item.severity}</span><strong>{item.title}</strong><code>{item.file}:{item.line}</code></button>)}</div><article className="finding-dossier"><div className="dossier-meta"><div><span>SEVERITY</span><strong className={finding.severity.toLowerCase()}>{finding.severity}</strong></div><div><span>FILE</span><code>{finding.file}</code></div><div><span>LINE</span><code>{finding.line}</code></div><div><span>ISSUE</span><strong>{finding.title}</strong></div></div><div className="dossier-body"><section><span>EVIDENCE</span><p>{finding.evidence}</p></section><section><span>WHY IT MATTERS</span><p>{finding.impact}</p></section><section><span>SUGGESTED REMEDIATION</span><p>{finding.fix}</p></section></div><div className="dossier-actions"><button onClick={() => setPromptOpen(true)}>Prepare fix prompt</button><button onClick={queueRescan} disabled={rescanState === "running"}>{rescanState === "running" ? "Checking…" : "Queue a rescan"}</button>{rescanState === "complete" && <span><Check />Rescan complete. This example still needs review.</span>}</div></article></section>

      <section className="pallos-section pallos-shell how-section" id="how"><div className="section-head"><div><p className="pallos-label">PROCESS</p><h2>How it works</h2></div></div><div className="steps-list">{steps.map(([number, title, body]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{body}</p></article>)}</div></section>

      <section className="pallos-section pallos-shell proof-section"><div className="section-head"><div><p className="pallos-label">EVIDENCE</p><h2>Proof, not promises.</h2></div><Link href="/proof">Open the Proof Lab <ArrowRight /></Link></div><div className="proof-rows"><article><span>Benchmarks</span><p>Benchmark data is being collected during the Pallos beta.</p></article><article><span>Case studies</span><p>Controlled public-repository scans document findings, fixes, and limits.</p></article><article><span>Tester feedback</span><p>Tester feedback is being collected during the Pallos beta.</p></article></div></section>

      <section className="pallos-section pallos-shell ai-context"><div><p className="pallos-label">DEVELOPMENT CONTEXT</p><h2>Built for fast, AI-assisted development.</h2><p>AI coding tools make it easier to move quickly. They can also make it easier to overlook authorization logic, secret handling, database policies, and client/server boundaries.</p></div><div><ul>{tools.map((tool) => <li key={tool}>{tool}</li>)}</ul><small>Pallos is not affiliated with these products.</small></div></section>

      <section className="pallos-section pallos-shell trust-section"><div className="section-head"><div><p className="pallos-label">SECURITY AND PRIVACY</p><h2>How Pallos handles your code</h2></div><Link href="/security">Read the security page <ArrowRight /></Link></div><div className="trust-table">{trustRows.map(([label, value]) => <div key={label}><strong>{label}</strong><span>{value}</span></div>)}</div></section>

      <section className="pallos-section pallos-shell tester-section"><div className="tester-copy"><p className="pallos-label">PRIVATE BETA · FEEDBACK WELCOME</p><h2>Check your project before you ship.</h2><p>Pallos is currently in beta. Run a scan and help improve the product.</p><div className="pallos-actions"><Link className="pallos-button primary" href="/scan">Scan a project <ArrowRight /></Link><a className="pallos-button secondary" href="#free-scan">Try the demo</a></div></div><div className="tester-form-wrap">{submitState === "success" ? <div className="tester-success"><span>REQUEST RECEIVED</span><h3>You are on the tester list.</h3><p>{submitMessage}</p><button onClick={() => setSubmitState("idle")}>Add another person</button></div> : <form onSubmit={submitWaitlist}><h3>Get tester updates</h3><label>Email address<input name="email" required type="email" autoComplete="email" placeholder="you@company.com" /></label><label>Main AI coding tool<select name="tool" required defaultValue="" onChange={(event) => setOtherTool(event.target.value === "Other")}><option value="" disabled>Select one</option><option>Lovable</option><option>Replit</option><option>Bolt</option><option>v0</option><option>Cursor</option><option>Claude Code</option><option>Codex</option><option>Other</option></select></label>{otherTool && <label>Other tool<input name="otherTool" required /></label>}<label>What did you build?<textarea name="building" required rows={3} /></label><label>Public or staging URL <small>Optional</small><input name="projectUrl" type="url" inputMode="url" /></label><label className="honeypot" aria-hidden="true">Company name<input name="companyWebsite" tabIndex={-1} autoComplete="off" /></label><label className="tester-consent"><input name="consent" value="yes" type="checkbox" required /><span>I agree to receive occasional Pallos testing updates.</span></label><button className="pallos-button primary" disabled={submitState === "sending"}>{submitState === "sending" ? "Sending…" : "Get tester updates"}</button>{submitState === "error" && <p className="tester-error" role="alert">{submitMessage}</p>}</form>}</div></section>
    </div>

    <footer className="pallos-footer"><div className="pallos-shell"><div><Link className="pallos-brand" href="#top"><Image src="/pallos-icon.svg" alt="" width={22} height={22} />Pallos</Link><p>Security checks for AI-built apps.</p></div><nav><a href="#checks">Product</a><Link href="/methodology">Methodology</Link><Link href="/security">Security</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><a href="https://github.com/rjakkampudi11/pallos-app" target="_blank" rel="noreferrer">GitHub</a><a href="mailto:pallosagent@gmail.com">Contact</a></nav></div></footer>

    {promptOpen && <div className="pallos-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setPromptOpen(false); }}><section className="pallos-modal" role="dialog" aria-modal="true" aria-labelledby="fix-prompt-title"><button className="modal-x" aria-label="Close" onClick={() => setPromptOpen(false)}><X /></button><p className="pallos-label">READY FOR YOUR CODING TOOL</p><h2 id="fix-prompt-title">Fix prompt prepared.</h2><p>Review the proposed change before applying it, then rescan.</p><pre>{fixPrompt}</pre><div className="pallos-actions"><button className="pallos-button primary" onClick={copyPrompt}>{promptCopied ? <><Check />Copied</> : <><Copy />Copy prompt</>}</button><button className="pallos-button secondary" onClick={() => { setPromptOpen(false); queueRescan(); }}>Queue verification</button></div></section></div>}
  </main>;
}
