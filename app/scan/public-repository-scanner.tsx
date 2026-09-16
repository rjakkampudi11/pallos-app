"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { ArrowClockwise, ArrowRight, CheckCircle, Copy, GithubLogo, LockKey, ShieldCheck, Warning, WarningCircle } from "@phosphor-icons/react";

type Finding = { ruleId: string; title: string; severity: "critical" | "high" | "review" | "low"; category: string; filePath: string; lineNumber: number | null; evidence: string; explanation: string; suggestedFix: string };
type Check = { id: string; title: string; status: "passed" | "failed" | "not_tested"; severity: "low" | "medium" | "high" | "critical" | null; explanation: string; remediation: string | null; evidence: string | null };
type ScanResult = { repository: string; repositoryUrl: string; branch: string; commitSha: string; filesScanned: number; eligibleFiles: number; bytesScanned: number; partial: boolean; scanReference: string; findingsCount: number; findingsTruncated: boolean; findingCounts: { confirmed: number; review: number }; findings: Finding[]; assessment: { score: number; grade: string; summary: string; coverage: number; checks: Check[] } };

function track(name: string, parameters: Record<string, string | number | boolean> = {}) {
  const analytics = (window as unknown as { gtag?: (command: "event", eventName: string, values: Record<string, string | number | boolean>) => void }).gtag;
  analytics?.("event", name, parameters);
}

export function PublicRepositoryScanner({ initialRepositoryUrl = "" }: { initialRepositoryUrl?: string }) {
  const [repositoryUrl, setRepositoryUrl] = useState(initialRepositoryUrl);
  const [state, setState] = useState<"idle" | "scanning" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedShare, setCopiedShare] = useState<"link" | "badge" | null>(null);
  const [feedbackState, setFeedbackState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [feedbackError, setFeedbackError] = useState("");

  const counts = useMemo(() => {
    const confirmed = result?.findingCounts.confirmed || 0;
    const review = result?.findingCounts.review || 0;
    const untested = result?.assessment.checks.filter((check) => check.status === "not_tested").length || 0;
    return { confirmed, review, untested };
  }, [result]);

  async function runScan(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setState("scanning"); setError(""); setShowAll(false); setFeedbackState("idle"); setFeedbackError("");
    const startedAt = performance.now();
    track("public_repo_scan_started");
    try {
      const response = await fetch("/api/public-repository-scan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ repositoryUrl }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The repository scan failed.");
      setResult(data); setState("done");
      track("public_repo_scan_completed", { score: data.assessment.score, grade: data.assessment.grade, findings: data.findingsCount, files_scanned: data.filesScanned, partial: data.partial, duration_ms: Math.round(performance.now() - startedAt) });
    } catch (scanError) {
      setResult(null); setState("error"); setError(scanError instanceof Error ? scanError.message : "The repository scan failed.");
      track("public_repo_scan_failed");
    }
  }

  async function copySummary() {
    if (!result) return;
    const findings = result.findings.slice(0, 5).map((finding) => `- ${finding.severity.toUpperCase()}: ${finding.title} — ${finding.filePath}${finding.lineNumber ? `:${finding.lineNumber}` : ""}`).join("\n");
    await navigator.clipboard.writeText(`Pallos scan: ${result.repository}\nScore: ${result.assessment.score}/100 (${result.assessment.grade})\nCoverage: ${result.assessment.coverage}%\nFiles scanned: ${result.filesScanned}\n${findings || "No risk signals verified."}\n\nScanned with https://pallosagent.com/scan`);
    setCopied(true); window.setTimeout(() => setCopied(false), 1800);
  }

  async function copyScanLink() {
    if (!result) return;
    const link = `https://pallosagent.com/scan?repo=${encodeURIComponent(result.repositoryUrl)}`;
    await navigator.clipboard.writeText(link);
    setCopiedShare("link");
    track("public_repo_scan_link_copied");
    window.setTimeout(() => setCopiedShare(null), 1800);
  }

  async function copyReadmeBadge() {
    if (!result) return;
    const link = `https://pallosagent.com/scan?repo=${encodeURIComponent(result.repositoryUrl)}`;
    const markdown = `[![Scan with Pallos](https://pallosagent.com/pallos-scan-badge.svg)](${link})`;
    await navigator.clipboard.writeText(markdown);
    setCopiedShare("badge");
    track("public_repo_readme_badge_copied");
    window.setTimeout(() => setCopiedShare(null), 1800);
  }

  async function sendFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setFeedbackState("sending"); setFeedbackError("");
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    const response = await fetch("/api/public-scan-feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...values, repository: result?.repository, scanReference: result?.scanReference }) });
    const data = await response.json();
    if (!response.ok) { setFeedbackState("error"); setFeedbackError(data.error || "Feedback could not be sent."); return; }
    setFeedbackState("sent");
    track("public_repo_feedback_submitted", { useful: String(values.useful || "") });
  }

  const visibleFindings = result ? (showAll ? result.findings : result.findings.slice(0, 5)) : [];
  const untestedChecks = result?.assessment.checks.filter((check) => check.status === "not_tested") || [];

  return <main className="public-repo-page">
    <header className="repo-scan-header"><nav><Link href="/" className="repo-scan-brand"><span />Pallos Agent</Link><div><Link href="/tools">Free tools</Link><Link href="/proof">Proof Lab</Link><Link href="/login?mode=signup&next=/connections" className="repo-scan-private">Connect a private repo</Link></div></nav></header>
    <section className="repo-scan-hero">
      <div className="repo-scan-kicker"><ShieldCheck weight="fill" />FREE PUBLIC REPOSITORY SCAN</div>
      <h1>Paste the repo.<br />Get the risks and fixes.</h1>
      <p>No GitHub connection, payment, or account. Pallos reads the public source at one commit and returns a plain-English report.</p>
      <form onSubmit={runScan} className="repo-scan-form">
        <label htmlFor="repository-url">Public GitHub repository</label>
        <div><GithubLogo weight="fill" /><input id="repository-url" value={repositoryUrl} onChange={(event) => setRepositoryUrl(event.target.value)} required placeholder="https://github.com/owner/repository" inputMode="url" autoComplete="url" /><button disabled={state === "scanning"}>{state === "scanning" ? <><ArrowClockwise className="spin" />Scanning…</> : <>Scan repository <ArrowRight weight="bold" /></>}</button></div>
        <small>Use a repository you own or are authorized to review. Public repositories only.</small>
      </form>
      <div className="repo-scan-trust"><span><LockKey weight="fill" />Read-only</span><span><CheckCircle weight="fill" />No secret values displayed</span><span><CheckCircle weight="fill" />5 free scans per day</span></div>
      {state === "error" && <div className="repo-scan-error"><WarningCircle weight="fill" />{error}</div>}
    </section>

    {state === "scanning" && <section className="repo-scan-loading"><div className="repo-scan-loader" /><h2>Reading the repository safely…</h2><p>Prioritizing API routes, auth, configuration, webhooks, and database policies.</p></section>}

    {result && state === "done" && <section className="repo-report" aria-live="polite">
      <div className="repo-report-head"><div><span>SCAN COMPLETE · {result.commitSha.slice(0, 8)}</span><h2>{result.repository}</h2><a href={result.repositoryUrl} target="_blank" rel="noreferrer">View public source <ArrowRight /></a></div><div className={`repo-score ${result.assessment.score < 70 ? "danger" : result.assessment.score < 90 ? "review" : "strong"}`}><strong>{result.assessment.score}</strong><small>/100</small><b>{result.assessment.grade}</b></div></div>
      <p className="repo-report-summary">{result.assessment.summary}</p>
      <div className="repo-report-stats"><article><span>CONFIRMED RISKS</span><strong>{counts.confirmed}</strong><small>Matched static patterns</small></article><article><span>REVIEW SIGNALS</span><strong>{counts.review}</strong><small>Needs human review</small></article><article><span>UNTESTED</span><strong>{counts.untested}</strong><small>Not counted as passes</small></article><article><span>COVERAGE</span><strong>{result.assessment.coverage}%</strong><small>{result.filesScanned} of {result.eligibleFiles} eligible files loaded</small></article></div>
      {result.partial && <div className="repo-partial"><Warning weight="fill" /><p><b>This was a capped public scan.</b> Pallos prioritized security-sensitive files. Connect GitHub for deeper coverage and automatic rescans.</p></div>}

      <div className="repo-report-title"><div><span>EVIDENCE + FIX DIRECTIONS</span><h2>{result.findingsCount ? `${result.findingsCount} ${result.findingsCount === 1 ? "signal" : "signals"} found` : "No matching risk signals"}</h2></div><button onClick={copySummary}><Copy />{copied ? "Copied" : "Copy summary"}</button></div>
      {result.findings.length === 0 ? <div className="repo-clean"><CheckCircle weight="fill" /><h3>No risk signals were verified in completed checks.</h3><p>This is not a security guarantee. Review the untested areas below and use runtime testing for behavior static code cannot prove.</p></div> : <div className="repo-findings">{visibleFindings.map((finding, index) => <article key={`${finding.ruleId}-${finding.filePath}-${finding.lineNumber}-${index}`} className={`repo-finding ${finding.severity}`}><div><span>{finding.severity === "review" ? "REVIEW" : finding.severity.toUpperCase()}</span><em>{finding.category}</em></div><h3>{finding.title}</h3><code>{finding.filePath}{finding.lineNumber ? `:${finding.lineNumber}` : ""}</code><p>{finding.explanation}</p><section><b>How to fix it</b><p>{finding.suggestedFix}</p></section><small>{finding.evidence}</small></article>)}</div>}
      {result.findings.length > 5 && <button className="repo-show-all" onClick={() => setShowAll((current) => !current)}>{showAll ? "Show only first 5" : `View all ${result.findings.length} signals`}</button>}
      {result.findingsTruncated && <p className="repo-finding-cap">Showing the first 100 signals. Connect the repository for a complete saved report.</p>}

      <div className="repo-untested"><div><span>WHAT PALLOS DID NOT PROVE</span><h2>Untested areas stay visible.</h2><p>A high score never converts missing evidence into a pass.</p></div><ul>{untestedChecks.map((check) => <li key={check.id}><b>{check.title}</b><span>{check.evidence || check.explanation}</span></li>)}</ul></div>
      <div className="repo-report-actions"><button onClick={() => void runScan()}><ArrowClockwise />Rescan latest commit</button><Link href="/login?mode=signup&next=/connections" onClick={() => track("public_repo_connect_clicked")}>Connect for deeper scans <ArrowRight /></Link></div>

      <div className="repo-share-kit"><div><span>MAKE THE NEXT SCAN EASIER</span><h2>Share this repository&apos;s scan entry point.</h2><p>The link prefills the repository but never publishes this report. The README badge sends visitors to the same read-only scanner.</p></div><div><button onClick={copyScanLink}><Copy />{copiedShare === "link" ? "Link copied" : "Copy scan link"}</button><button onClick={copyReadmeBadge}><Copy />{copiedShare === "badge" ? "Badge copied" : "Copy README badge"}</button></div></div>

      <form className="repo-feedback" onSubmit={sendFeedback}>
        <div><span>TWO QUICK QUESTIONS</span><h2>Did this report help?</h2><p>Your answer improves the next Pallos build.</p></div>
        {feedbackState === "sent" ? <div className="repo-feedback-sent"><CheckCircle weight="fill" />Thanks—your feedback was sent.</div> : <><label>Was this useful?<select name="useful" required defaultValue=""><option value="" disabled>Choose one</option><option>Yes</option><option>Somewhat</option><option>No</option></select></label><label>What was unclear or missing?<textarea name="improvement" rows={3} required placeholder="One short sentence is enough." /></label><button disabled={feedbackState === "sending"}>{feedbackState === "sending" ? "Sending…" : "Send feedback"}</button>{feedbackState === "error" && <p className="repo-feedback-error">{feedbackError}</p>}</>}
      </form>
    </section>}
  </main>;
}
