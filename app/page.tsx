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
  { icon: Key, title: "Exposed keys and tokens", body: "Find private credentials that accidentally ended up in code a visitor can reach." },
  { icon: Database, title: "Overly open database access", body: "Spot Supabase rules that may let the wrong person read or change data." },
  { icon: UserFocus, title: "Weak admin protection", body: "Check whether sensitive actions confirm the user has the right permission—not just that they signed in." },
  { icon: BracketsCurly, title: "Private work running in public code", body: "Flag server-only operations that were accidentally placed in browser code." },
  { icon: GitBranch, title: "Risky code changes", body: "Explain which recent changes deserve a closer look and why." },
  { icon: MagnifyingGlass, title: "Fixes that still need proof", body: "Rescan after a change so an issue is not marked fixed until the risky pattern is gone." },
];

const steps = [
  ["01", "Connect a project", "Choose a GitHub repository or start with the safe demo. Pallos only reads the code you allow it to see."],
  ["02", "Review the important risks", "Pallos shows the affected file, what it found, and why it matters in plain language."],
  ["03", "Fix and check again", "Use the suggested next step, make the change yourself, then rescan to verify the issue is gone."],
];

const demoFindings = [
  { level: "Critical", title: "Service key exposed to the browser", file: "src/lib/supabase-client.ts", note: "Move the key into server-only environment storage and verify database policies." },
  { level: "High", title: "Private action runs in a client component", file: "components/payment-settings.tsx", note: "Move the operation behind a server route and return only safe response fields." },
  { level: "Review", title: "Admin route lacks role enforcement", file: "app/api/admin/users/route.ts", note: "Require an admin role on the server before returning account data." },
];

const faqs = [
  ["What does the free API check do?", "It checks whether one public JSON URL responds correctly and maps its structure without showing the returned values. The safe Pallos demo can be tested as many times as you want."],
  ["Does Pallos guarantee my app is secure?", "No. Pallos checks a focused set of risks and shows exactly what it reviewed. It is a useful second pass, not a replacement for a full security program."],
  ["Do I need to be a security expert?", "No. Pallos is written for founders, students, and developers who want clear explanations instead of a dense security report."],
  ["Will Pallos automatically change my app?", "Not in V1. Pallos explains the issue and prepares a fix path, but you stay in control of every code change."],
  ["What stacks will be supported first?", "The private beta is focused on JavaScript, TypeScript, Next.js, Supabase, and the common services used around them."],
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
    description: "A plain-English security review for AI-built apps that finds exposed secrets, unsafe access, and risky code before launch.",
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
          <a href="#checks" onClick={() => setMenuOpen(false)}>What it checks</a><a href="#how" onClick={() => setMenuOpen(false)}>How it works</a><a href="#free-scan" onClick={() => setMenuOpen(false)}>Try it</a><a href="#faq" onClick={() => setMenuOpen(false)}>Questions</a><a className="mobile-nav-cta" href="#waitlist" onClick={() => setMenuOpen(false)}>Join the beta</a>
        </div>
        <a className="button small nav-cta" href="#waitlist">Join the beta <ArrowRight weight="bold" /></a>
        <button className="menu-button" aria-expanded={menuOpen} aria-label={menuOpen ? "Close menu" : "Open menu"} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <List />}</button>
      </nav>
    </header>

    <div id="main-content">
      <section className="hero section shell">
        <div className="hero-copy-wrap reveal">
          <div className="eyebrow"><span className="pulse" />SECURITY CHECKS FOR AI-BUILT APPS</div>
          <h1>Find risky code before your users do.</h1>
          <p className="hero-copy">Pallos reads your project and points out security mistakes in plain English. You see what is wrong, where it is, and what to do next.</p>
          <div className="hero-actions"><a className="button" href="#free-scan">Try the safe demo <ArrowRight weight="bold" /></a><a className="ghost-button" href="https://pallosagent.com/login?mode=signup&next=/connections">Scan a GitHub project</a></div>
          <div className="hero-proof"><span><Check weight="bold" />Read-only access</span><span><Check weight="bold" />Plain-English results</span><span><Check weight="bold" />You control every fix</span></div>
        </div>
        <div className="product-window reveal delay-1" aria-label="Pallos scan preview">
          <div className="window-top"><div><span /><span /><span /></div><small>pallos / scan-result</small><b>DEMO</b></div>
          <div className="window-body"><div className="scan-summary"><div><span>Example result</span><strong>2 issues need your attention</strong></div></div>{demoFindings.slice(0, 2).map((finding, index) => <div className={`preview-finding ${index === 0 ? "critical" : "high"}`} key={finding.title}><span>0{index + 1}</span><div><strong>{finding.title}</strong><small>{finding.file}</small></div><em>{finding.level}</em></div>)}<div className="evidence-note"><Code /><div><b>Why this matters</b><p>A private database key can bypass the rules your public app depends on.</p></div></div><div className="window-footer"><span>Read-only scan</span><b>No files changed</b></div></div>
        </div>
      </section>

      <section className="section shell split-section" id="checks"><div className="section-intro sticky-intro"><div className="eyebrow">WHAT IT CHECKS</div><h2>Six common mistakes, explained simply.</h2><p>Pallos focuses on problems that can expose private data or give the wrong person too much access.</p></div><div className="check-list">{checks.map(({ icon: Icon, title, body }, index) => <article key={title}><div className="check-number">0{index + 1}</div><Icon className="check-icon" /><div><h3>{title}</h3><p>{body}</p></div></article>)}</div></section>

      <section className="section how-section" id="how"><div className="shell"><div className="center-intro"><div className="eyebrow">HOW IT WORKS</div><h2>Connect. Understand. Fix.</h2><p>You do not need to understand every line of code to make a safer decision.</p></div><div className="workflow-grid">{steps.map(([number, title, body]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{body}</p></article>)}</div></div></section>

      <FreeApiScan />

      <section className="section shell demo-section" id="demo">
        <div className="section-intro"><div className="eyebrow">EXAMPLE REPORT</div><h2>See exactly what a finding looks like.</h2><p>Choose an example to see the problem, the affected file, and the suggested next step.</p><Link className="ghost-button inline-button" href="https://pallosagent.com/login?mode=signup&next=/home">Open the full dashboard <ArrowRight /></Link></div>
        <div className="demo-console"><div className="demo-sidebar"><div className="demo-sidebar-title"><span>Scan 0042</span><b>3 open</b></div>{demoFindings.map((finding, index) => <button key={finding.title} className={activeFinding === index ? "active" : ""} onClick={() => { setActiveFinding(index); setRescanState("idle"); }}><span>{finding.level}</span><strong>{finding.title}</strong><small>{finding.file}</small></button>)}</div><div className="demo-detail"><span className={`severity ${activeDemoFinding.level.toLowerCase()}`}>{activeDemoFinding.level}</span><h3>{activeDemoFinding.title}</h3><code>{activeDemoFinding.file}</code><div className="detail-block"><small>WHAT PALLOS SAW</small><p>{activeFinding === 0 ? "A server-only credential appears inside code that can be delivered to the browser." : activeFinding === 1 ? "A private operation is being called from a component that runs for every user." : "The route checks whether someone is signed in, but not whether they are an administrator."}</p></div><div className="detail-block"><small>NEXT STEP</small><p>{activeDemoFinding.note}</p></div>{rescanState !== "idle" && <div className={`rescan-status ${rescanState}`} role="status">{rescanState === "running" ? <><ArrowClockwise className="spin" />Checking the sample fix…</> : <><CheckCircle weight="fill" />Rescan complete. This finding still needs review.</>}</div>}<div className="demo-actions"><button onClick={() => setPromptOpen(true)}>Prepare fix prompt</button><button onClick={queueRescan} disabled={rescanState === "running"}>{rescanState === "running" ? "Rescanning…" : "Queue a rescan"}</button></div></div></div>
      </section>

      <section className="section shell faq-section" id="faq"><div className="section-intro"><div className="eyebrow">QUESTIONS</div><h2>What to know before you connect a project.</h2></div><div className="faq-list">{faqs.map(([question, answer], index) => <details key={question}><summary aria-controls={`faq-answer-${index}`}>{question}<CaretDown aria-hidden="true" /></summary><p id={`faq-answer-${index}`}>{answer}</p></details>)}</div></section>

      <section className="section waitlist-section" id="waitlist"><div className="shell waitlist-grid"><div className="waitlist-copy"><div className="eyebrow">PRIVATE BETA</div><h2>Help test Pallos.</h2><p>Use Pallos on a safe project for a few weeks and tell us what is clear, confusing, accurate, or missing.</p><div className="privacy-note"><Check weight="bold" />Use a public, staging, or disposable project—never production secrets.</div></div><div className="form-card">{submitState === "success" ? <div className="success"><span><Check weight="bold" /></span><h3>Your tester request is in.</h3><p>{submitMessage}</p><button className="text-link" onClick={() => setSubmitState("idle")}>Add another person</button></div> : <form onSubmit={submitWaitlist}><label>Email address<input name="email" required type="email" autoComplete="email" placeholder="you@company.com" /></label><label>Main AI coding tool<select name="tool" required defaultValue="" onChange={(event) => setOtherTool(event.target.value === "Other")}><option value="" disabled>Select one</option><option>Lovable</option><option>Replit</option><option>Bolt</option><option>v0</option><option>Cursor</option><option>Claude Code</option><option>Codex</option><option>Other</option></select></label>{otherTool && <label className="conditional-field">What other AI coding platform do you use?<input name="otherTool" required placeholder="Enter the platform name" autoFocus /></label>}<label>What did you build?<textarea name="building" required placeholder="A short description is enough." /></label><label>Public or staging URL <span className="optional-label">Optional</span><input name="projectUrl" type="url" inputMode="url" placeholder="https://your-app.com" /></label><label className="honeypot" aria-hidden="true">Company name<input name="companyWebsite" tabIndex={-1} autoComplete="off" /></label><label className="consent"><input name="consent" value="yes" type="checkbox" required />I agree to receive updates about the Pallos private beta.</label><button className="button full" disabled={submitState === "sending"}>{submitState === "sending" ? "Sending…" : "Join the beta"}<ArrowRight weight="bold" /></button>{submitState === "error" && <p className="form-message error" role="alert">{submitMessage}</p>}</form>}</div></div></section>
    </div>

    <footer className="footer" id="contact"><div className="shell footer-top"><div><Link className="brand" href="#top"><span className="brand-dot" />Pallos Agent</Link><p>Plain-English security checks for apps built with AI.</p></div><div className="footer-contact"><span>CONTACT</span><a href="mailto:pallosagent@gmail.com"><EnvelopeSimple />pallosagent@gmail.com</a><button type="button" onClick={() => navigator.clipboard.writeText("pallosagent")}><DiscordLogo />Discord: pallosagent</button></div><div className="social-directory">{socialAccounts.map(({ label, handle, href, icon: Icon }) => <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={`${label}: ${handle}`}><Icon /><span><small>{label}</small>{handle}</span><ArrowRight /></a>)}</div></div><div className="shell footer-bottom"><span>© 2026 Pallos Agent</span><div><Link href="/security">Security</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></div></div></footer>

    {promptOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPromptOpen(false); }}><section className="prompt-modal" role="dialog" aria-modal="true" aria-labelledby="prompt-title"><button className="modal-close" aria-label="Close fix prompt" onClick={() => setPromptOpen(false)}><X /></button><div className="eyebrow">READY FOR YOUR AI TOOL</div><h2 id="prompt-title">Fix prompt prepared.</h2><p>Paste this into your coding assistant, review its proposed change, then return to Pallos for verification.</p><pre>{fixPrompt}</pre><div className="modal-actions"><button className="button" onClick={copyPrompt}>{promptCopied ? <><Check />Copied</> : <><Copy />Copy prompt</>}</button><button className="ghost-button" onClick={() => { setPromptOpen(false); queueRescan(); }}>Queue verification</button></div></section></div>}
  </main>;
}
