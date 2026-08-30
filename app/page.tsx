"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import {
  ArrowClockwise, ArrowRight, BracketsCurly, CaretDown, Check, CheckCircle,
  Code, Copy, Database, DiscordLogo, EnvelopeSimple, FacebookLogo, GitBranch,
  InstagramLogo, Key, LinkedinLogo, List, MagnifyingGlass, TiktokLogo,
  UserFocus, UsersThree, X, XLogo,
} from "@phosphor-icons/react";
import { FreeApiScan } from "@/app/components/free-api-scan";

const checks = [
  { icon: Key, title: "Secrets that reached the browser", body: "Catch service keys, private tokens, and environment values that should never ship with client code." },
  { icon: Database, title: "Database rules that are too open", body: "Review Supabase policies and access patterns that could expose customer or workspace data." },
  { icon: UserFocus, title: "Admin access without enough proof", body: "Find routes that check for a user but do not confirm the role or permission the action actually needs." },
  { icon: BracketsCurly, title: "Messy client and server boundaries", body: "See when private operations drift into public components while an AI tool moves code around." },
  { icon: GitBranch, title: "Changes that need a second look", body: "Turn a confusing diff into a short explanation of what changed, why it matters, and what to verify." },
  { icon: MagnifyingGlass, title: "Fixes that were never rechecked", body: "Keep an issue visible until a fresh scan confirms the risky pattern is no longer present." },
];

const steps = [
  ["01", "Bring in the app you are building", "Start with a demo, staging project, repository, or guided upload. Pallos maps the parts of the app that deserve review."],
  ["02", "Get a focused scan, not a wall of warnings", "The first version prioritizes exposed secrets, database access, admin routes, and client/server mistakes common in AI-built apps."],
  ["03", "Understand the finding in plain language", "Every result includes the affected file, evidence, likely impact, and a practical prompt or developer note for the next fix."],
  ["04", "Rescan before calling it done", "Pallos keeps the finding open until the checked code no longer shows the same risky pattern."],
];

const demoFindings = [
  { level: "Critical", title: "Service key exposed to the browser", file: "src/lib/supabase-client.ts", note: "Move the key into server-only environment storage and verify database policies." },
  { level: "High", title: "Private action runs in a client component", file: "components/payment-settings.tsx", note: "Move the operation behind a server route and return only safe response fields." },
  { level: "Review", title: "Admin route lacks role enforcement", file: "app/api/admin/users/route.ts", note: "Require an admin role on the server before returning account data." },
];

const faqs = [
  ["What does the free scan do?", "It makes one server-side request to a public HTTPS JSON API, confirms whether the response is reachable and valid, and shows the response structure without displaying field values. Create an account to save that response as a baseline and compare future checks."],
  ["Does Pallos guarantee my app is secure?", "No. Pallos checks a focused set of risks and shows exactly what it reviewed. It is a useful second pass, not a replacement for a full security program."],
  ["Is this built for developers?", "It can help developers, but Pallos is written for founders and vibecoders who need to understand what their code is doing without translating a dense scanner report."],
  ["Will Pallos automatically change my app?", "Not in V1. Pallos explains the issue and prepares a fix path, but you stay in control of every code change."],
  ["What stacks will be supported first?", "The private beta is focused on JavaScript, TypeScript, Next.js, Supabase, and the common services used around them."],
  ["What does the sandbox dashboard show?", "It shows the planned review flow with realistic demo findings, agent runs, projects, connections, activity, and verification states. No live repository is connected yet."],
];

const socialAccounts = [
  { label: "Instagram", handle: "@pallos_agent", href: "https://www.instagram.com/pallos_agent/", icon: InstagramLogo },
  { label: "Facebook", handle: "Pallos", href: "https://www.facebook.com/Pallos", icon: FacebookLogo },
  { label: "X", handle: "@Pallos_Agent", href: "https://x.com/Pallos_Agent", icon: XLogo },
  { label: "TikTok", handle: "@pallos_agent", href: "https://www.tiktok.com/@pallos_agent", icon: TiktokLogo },
  { label: "LinkedIn", handle: "Pallos", href: "https://www.linkedin.com/in/pallos", icon: LinkedinLogo },
  { label: "Indie Hackers", handle: "@PallosAgent", href: "https://www.indiehackers.com/@PallosAgent", icon: UsersThree },
];

type SubmitState = "idle" | "sending" | "success" | "error";
type RescanState = "idle" | "running" | "complete";

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeFinding, setActiveFinding] = useState(0);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [submitMessage, setSubmitMessage] = useState("");
  const [otherTool, setOtherTool] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);
  const [rescanState, setRescanState] = useState<RescanState>("idle");

  const activeDemoFinding = demoFindings[activeFinding];
  const fixPrompt = `Review ${activeDemoFinding.file} for: ${activeDemoFinding.title}. ${activeDemoFinding.note} Keep the change minimal, explain what changed, and include a verification checklist. Do not expose secrets or weaken authorization.`;

  async function copyPrompt() {
    await navigator.clipboard.writeText(fixPrompt);
    setPromptCopied(true);
    window.setTimeout(() => setPromptCopied(false), 1800);
  }

  function queueRescan() {
    if (rescanState === "running") return;
    setRescanState("running");
    window.setTimeout(() => setRescanState("complete"), 1400);
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
      setSubmitMessage("You are on the list. We will email you when private beta spots open.");
    } catch (error) {
      setSubmitState("error");
      setSubmitMessage(error instanceof Error ? error.message : "We could not save your request.");
    }
  }

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Pallos Agent",
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Web",
    url: "https://pallosagent.info",
    description: "A clear second pass for AI-built apps that explains exposed secrets, unsafe access, risky routes, and changes worth reviewing before launch.",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD", availability: "https://schema.org/PreOrder" },
  };

  const faqData = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map(([question, answer]) => ({ "@type": "Question", name: question, acceptedAnswer: { "@type": "Answer", text: answer } })) };

  return <main className="outreach-site" id="top">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqData) }} />

    <header className="site-header">
      <nav className="nav shell" aria-label="Main navigation">
        <Link className="brand" href="#top"><span className="brand-dot" />Pallos Agent</Link>
        <div className={`navlinks ${menuOpen ? "open" : ""}`}>
          <a href="#free-scan" onClick={() => setMenuOpen(false)}>Free scan</a><a href="#checks" onClick={() => setMenuOpen(false)}>What it checks</a><a href="#how" onClick={() => setMenuOpen(false)}>How it works</a><a href="#demo" onClick={() => setMenuOpen(false)}>Demo</a><a href="#faq" onClick={() => setMenuOpen(false)}>FAQ</a><a className="mobile-nav-cta" href="#waitlist" onClick={() => setMenuOpen(false)}>Become a tester</a>
        </div>
        <a className="button small nav-cta" href="#waitlist">Become a tester <ArrowRight weight="bold" /></a>
        <button className="menu-button" aria-expanded={menuOpen} aria-label={menuOpen ? "Close menu" : "Open menu"} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <List />}</button>
      </nav>
    </header>

    <div id="main-content">
      <section className="hero section shell">
        <div className="hero-copy-wrap reveal">
          <div className="eyebrow"><span className="pulse" />PRIVATE BETA FOR AI-BUILT APPS</div>
          <h1>Build fast. Know what your AI changed.</h1>
          <p className="hero-copy">Pallos gives vibecoders a clear second pass before launch—showing exposed keys, loose data access, unsafe admin routes, and the exact code that deserves another look.</p>
          <div className="hero-actions"><a className="button" href="#free-scan">Scan a public API free <ArrowRight weight="bold" /></a><a className="ghost-button" href="https://pallosagent.com/login?mode=signup&next=/connections">Connect GitHub read-only</a></div>
          <div className="hero-proof"><span><Check weight="bold" />Plain-English findings</span><span><Check weight="bold" />Human-controlled fixes</span><span><Check weight="bold" />Built for fast-moving founders</span></div>
        </div>
        <div className="product-window reveal delay-1" aria-label="Pallos scan preview">
          <div className="window-top"><div><span /><span /><span /></div><small>pallos / scan-result</small><b>DEMO</b></div>
          <div className="window-body"><div className="scan-summary"><div><span>Launch review</span><strong>3 findings need attention</strong></div><div className="score-chip"><b>72</b><small>/100</small></div></div>{demoFindings.slice(0, 2).map((finding, index) => <div className={`preview-finding ${index === 0 ? "critical" : "high"}`} key={finding.title}><span>0{index + 1}</span><div><strong>{finding.title}</strong><small>{finding.file}</small></div><em>{finding.level}</em></div>)}<div className="evidence-note"><Code /><div><b>Why this matters</b><p>A private database key can bypass the rules your public app depends on.</p></div></div><div className="window-footer"><span>No files changed</span><b>Evidence attached</b></div></div>
        </div>
      </section>

      <FreeApiScan />

      <section className="stats-band"><div className="shell stats-grid"><article><strong>$4.88M</strong><p>Average global cost of a data breach in IBM&apos;s 2024 report.</p><a href="https://www.ibm.com/think/insights/whats-new-2024-cost-of-a-data-breach-report" target="_blank" rel="noreferrer">IBM, 2024</a></article><article><strong>12.8M</strong><p>New secrets detected in public GitHub commits during 2023.</p><a href="https://blog.gitguardian.com/the-state-of-secrets-sprawl-2024/" target="_blank" rel="noreferrer">GitGuardian, 2024</a></article><div className="stats-message"><span>THE REAL PROBLEM</span><h2>The code works. That does not mean you know what it is doing.</h2><a href="#checks">Here is what Pallos checks <ArrowRight /></a></div></div></section>

      <section className="section shell split-section" id="checks"><div className="section-intro sticky-intro"><div className="eyebrow">WHAT IT CHECKS</div><h2>A practical review for the mistakes that hide inside fast builds.</h2><p>Pallos starts with issues a founder can understand and act on before real customers, real data, and real bills enter the app.</p><a className="text-link" href="#how">See how the review works <ArrowRight /></a></div><div className="check-list">{checks.map(({ icon: Icon, title, body }, index) => <article key={title}><div className="check-number">0{index + 1}</div><Icon className="check-icon" /><div><h3>{title}</h3><p>{body}</p></div></article>)}</div></section>

      <section className="section how-section" id="how"><div className="shell"><div className="center-intro"><div className="eyebrow">HOW IT WORKS</div><h2>One clear path from AI-generated code to a decision you can trust.</h2><p>The product stays useful even when you cannot explain every line of the app yourself.</p></div><div className="workflow-grid">{steps.map(([number, title, body]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{body}</p></article>)}</div><div className="process-line"><span>App connected</span><ArrowRight /><span>Risk found</span><ArrowRight /><span>Reason explained</span><ArrowRight /><span>Fix verified</span></div></div></section>

      <section className="section shell demo-section" id="demo">
        <div className="section-intro"><div className="eyebrow">INTERACTIVE DEMO</div><h2>Specific enough to act on. Clear enough to understand.</h2><p>Select a sample finding, prepare a usable fix prompt, and run a demo verification without connecting an app.</p><Link className="ghost-button inline-button" href="https://pallosagent.com/login?mode=signup&next=/home">Create an account to try the dashboard <ArrowRight /></Link></div>
        <div className="demo-console"><div className="demo-sidebar"><div className="demo-sidebar-title"><span>Scan 0042</span><b>3 open</b></div>{demoFindings.map((finding, index) => <button key={finding.title} className={activeFinding === index ? "active" : ""} onClick={() => { setActiveFinding(index); setRescanState("idle"); }}><span>{finding.level}</span><strong>{finding.title}</strong><small>{finding.file}</small></button>)}</div><div className="demo-detail"><span className={`severity ${activeDemoFinding.level.toLowerCase()}`}>{activeDemoFinding.level}</span><h3>{activeDemoFinding.title}</h3><code>{activeDemoFinding.file}</code><div className="detail-block"><small>WHAT PALLOS SAW</small><p>{activeFinding === 0 ? "A server-only credential appears inside code that can be delivered to the browser." : activeFinding === 1 ? "A private operation is being called from a component that runs for every user." : "The route checks whether someone is signed in, but not whether they are an administrator."}</p></div><div className="detail-block"><small>NEXT STEP</small><p>{activeDemoFinding.note}</p></div>{rescanState !== "idle" && <div className={`rescan-status ${rescanState}`} role="status">{rescanState === "running" ? <><ArrowClockwise className="spin" />Checking the sample fix…</> : <><CheckCircle weight="fill" />Rescan complete. This finding still needs review.</>}</div>}<div className="demo-actions"><button onClick={() => setPromptOpen(true)}>Prepare fix prompt</button><button onClick={queueRescan} disabled={rescanState === "running"}>{rescanState === "running" ? "Rescanning…" : "Queue a rescan"}</button></div></div></div>
      </section>

      <section className="section trust-section"><div className="shell trust-grid"><div><div className="eyebrow">BUILT FOR YOUR WORKFLOW</div><h2>Pallos sits between “It runs” and “I am ready to launch.”</h2></div><article><strong>01</strong><h3>Your app stays under your control</h3><p>V1 reviews and explains. It does not silently rewrite files, deploy changes, or decide that a risk is acceptable for you.</p></article><article><strong>02</strong><h3>Every warning needs evidence</h3><p>A finding points back to the file, route, policy, or configuration that caused it—so you are not acting on a black-box score.</p></article><article><strong>03</strong><h3>The language is made for builders</h3><p>You get enough detail to make a decision or hand a useful request to your developer or AI coding tool.</p></article></div></section>

      <section className="section shell faq-section" id="faq"><div className="section-intro"><div className="eyebrow">FAQ</div><h2>The questions worth asking before you connect an app.</h2></div><div className="faq-list">{faqs.map(([question, answer], index) => <details key={question}><summary aria-controls={`faq-answer-${index}`}>{question}<CaretDown aria-hidden="true" /></summary><p id={`faq-answer-${index}`}>{answer}</p></details>)}</div></section>

      <section className="section waitlist-section" id="waitlist"><div className="shell waitlist-grid"><div className="waitlist-copy"><div className="eyebrow">PRIVATE BETA</div><h2>Become a Pallos tester.</h2><p>Tell us what you built and which AI coding tool you used. We will invite a small group to try the read-only GitHub scan and API monitor.</p><div className="privacy-note"><Check weight="bold" />No production credentials required. No list selling.</div></div><div className="form-card">{submitState === "success" ? <div className="success"><span><Check weight="bold" /></span><h3>Your tester request is in.</h3><p>{submitMessage}</p><button className="text-link" onClick={() => setSubmitState("idle")}>Add another person</button></div> : <form onSubmit={submitWaitlist}><label>Email address<input name="email" required type="email" autoComplete="email" placeholder="you@company.com" /></label><label>Main AI coding tool<select name="tool" required defaultValue="" onChange={(event) => setOtherTool(event.target.value === "Other")}><option value="" disabled>Select one</option><option>Lovable</option><option>Replit</option><option>Bolt</option><option>v0</option><option>Cursor</option><option>Claude Code</option><option>Codex</option><option>Other</option></select></label>{otherTool && <label className="conditional-field">What other AI coding platform do you use?<input name="otherTool" required placeholder="Enter the platform name" autoFocus /></label>}<label>What did you build?<textarea name="building" required placeholder="A short description is enough." /></label><label>Public or staging URL <span className="optional-label">Optional</span><input name="projectUrl" type="url" inputMode="url" placeholder="https://your-app.com" /></label><label className="honeypot" aria-hidden="true">Company name<input name="companyWebsite" tabIndex={-1} autoComplete="off" /></label><label className="consent"><input name="consent" value="yes" type="checkbox" required />I agree to receive updates about the Pallos private beta.</label><button className="button full" disabled={submitState === "sending"}>{submitState === "sending" ? "Sending…" : "Become a tester"}<ArrowRight weight="bold" /></button>{submitState === "error" && <p className="form-message error" role="alert">{submitMessage}</p>}</form>}</div></div></section>
    </div>

    <footer className="footer" id="contact"><div className="shell footer-top"><div><Link className="brand" href="#top"><span className="brand-dot" />Pallos Agent</Link><p>A clearer second pass for people building apps with AI.</p></div><div className="footer-contact"><span>CONTACT</span><a href="mailto:pallosagent@gmail.com"><EnvelopeSimple />pallosagent@gmail.com</a><button type="button" onClick={() => navigator.clipboard.writeText("pallosagent")}><DiscordLogo />Discord: pallosagent</button></div><div className="social-directory">{socialAccounts.map(({ label, handle, href, icon: Icon }) => <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={`${label}: ${handle}`}><Icon /><span><small>{label}</small>{handle}</span><ArrowRight /></a>)}</div></div><div className="shell footer-bottom"><span>© 2026 Pallos Agent</span><div><Link href="/security">Security</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></div></div></footer>

    {promptOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPromptOpen(false); }}><section className="prompt-modal" role="dialog" aria-modal="true" aria-labelledby="prompt-title"><button className="modal-close" aria-label="Close fix prompt" onClick={() => setPromptOpen(false)}><X /></button><div className="eyebrow">READY FOR YOUR AI TOOL</div><h2 id="prompt-title">Fix prompt prepared.</h2><p>Paste this into your coding assistant, review its proposed change, then return to Pallos for verification.</p><pre>{fixPrompt}</pre><div className="modal-actions"><button className="button" onClick={copyPrompt}>{promptCopied ? <><Check />Copied</> : <><Copy />Copy prompt</>}</button><button className="ghost-button" onClick={() => { setPromptOpen(false); queueRescan(); }}>Queue verification</button></div></section></div>}
  </main>;
}
