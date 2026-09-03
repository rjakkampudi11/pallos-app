"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import {
  ArrowClockwise,
  ArrowRight,
  BracketsCurly,
  Check,
  CheckCircle,
  Copy,
  LockKey,
  ShareNetwork,
  WarningCircle,
} from "@phosphor-icons/react";
import type { FreeScanSummary } from "@/lib/free-scan";

type ScanState = "idle" | "scanning" | "complete" | "error";

export function FreeApiScan() {
  const [url, setUrl] = useState("");
  const [state, setState] = useState<ScanState>("idle");
  const [result, setResult] = useState<FreeScanSummary | null>(null);
  const [message, setMessage] = useState("");
  const [scanUsed, setScanUsed] = useState(false);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    const requestedUrl = new URLSearchParams(window.location.search).get("scanUrl");
    if (!requestedUrl?.startsWith("https://")) return;
    const prefillTimer = window.setTimeout(() => setUrl(requestedUrl), 0);
    return () => window.clearTimeout(prefillTimer);
  }, []);

  async function runScan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("scanning");
    setMessage("");
    setScanUsed(false);
    setResult(null);
    try {
      const response = await fetch("/api/free-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await response.json();
      if (!response.ok) {
        setScanUsed(Boolean(data.used));
        throw new Error(data.error || "The scan could not be completed.");
      }
      setResult(data.result as FreeScanSummary);
      setState("complete");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "The scan could not be completed.");
      setState("error");
    }
  }

  async function sharePallos() {
    const shareData = {
      title: "Free Pallos API scan",
      text: "Check whether a public JSON API is reachable and baseline-ready with Pallos.",
      url: "https://pallosagent.info/#free-scan",
    };
    try {
      if (navigator.share) await navigator.share(shareData);
      else await navigator.clipboard.writeText(shareData.url);
      setShared(true);
      window.setTimeout(() => setShared(false), 1800);
    } catch { /* Closing the native share sheet should not show an error. */ }
  }

  return <section className="section free-scan-section" id="free-scan">
    <div className="shell free-scan-shell">
      <div className="free-scan-intro">
        <div className="eyebrow"><span className="pulse" />FREE FIRST CHECK</div>
        <h2>See what Pallos can read before creating an account.</h2>
        <p>Paste one public JSON API URL. Pallos checks whether it is reachable, returns valid JSON, and is ready to become a monitored baseline.</p>
        <div className="free-scan-privacy"><LockKey weight="fill" /><span><strong>Values stay hidden.</strong> The free result shows structure and status—not the contents of your response.</span></div>
      </div>

      <div className="free-scan-card">
        {!result && <form onSubmit={runScan}>
          <div className="scan-form-heading"><BracketsCurly /><div><span>ONE SCAN · NO ACCOUNT</span><h3>Check a public JSON endpoint</h3></div></div>
          <label htmlFor="free-scan-url">Public JSON API URL</label>
          <div className="free-scan-input-row"><input id="free-scan-url" type="url" required value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://your-app.com/api/status" autoComplete="url" /><button className="button" disabled={state === "scanning"}>{state === "scanning" ? <ArrowClockwise className="spin" /> : <ArrowRight weight="bold" />}{state === "scanning" ? "Checking…" : "Run free scan"}</button></div>
          <button className="sample-api-button" type="button" onClick={() => setUrl(`${window.location.origin}/api/training/profile`)}>Use the safe Pallos demo API</button>
          <div className="scan-boundaries"><span><Check />HTTPS only</span><span><Check />Public endpoints only</span><span><Check />1 MB response limit</span></div>
          {state === "error" && <div className="free-scan-error" role="alert"><WarningCircle /><span>{message}{scanUsed && <Link href="https://pallosagent.com/login?mode=signup&next=/monitor">Create a free account to continue <ArrowRight /></Link>}</span></div>}
        </form>}

        {result && <div className={`free-scan-result ${result.outcome}`} aria-live="polite">
          <div className="scan-result-head"><span className="scan-result-icon">{result.outcome === "healthy" ? <CheckCircle weight="fill" /> : <WarningCircle weight="fill" />}</span><div><span>SCAN COMPLETE</span><h3>{result.hostname}</h3><p>{result.message}</p></div><em>{result.statusCode ? `HTTP ${result.statusCode}` : "NO RESPONSE"}</em></div>
          <div className="scan-result-metrics"><div><span>RESPONSE</span><strong>{result.durationMs} ms</strong></div><div><span>JSON ROOT</span><strong>{result.rootType || "Not detected"}</strong></div><div><span>FIELDS MAPPED</span><strong>{result.fieldCount}</strong></div></div>
          <div className="scan-checks"><span className={result.checks.httpSuccess ? "pass" : "fail"}>{result.checks.httpSuccess ? <Check /> : <WarningCircle />}Successful HTTP response</span><span className={result.checks.validJson ? "pass" : "fail"}>{result.checks.validJson ? <Check /> : <WarningCircle />}Valid JSON detected</span><span className="pass"><Check />Public HTTPS address</span></div>
          {result.fields.length > 0 && <div className="scan-schema"><div><span>STRUCTURE PREVIEW</span><small>Response values are never displayed</small></div>{result.fields.map((field) => <p key={field.path}><code>{field.path}</code><em>{field.type}</em></p>)}</div>}
          <div className="free-scan-next"><div><span>NEXT STEP</span><strong>Save this response as a baseline, then let Pallos detect future breakage.</strong></div><Link className="button" href="https://pallosagent.com/login?mode=signup&next=/monitor">Create free account <ArrowRight weight="bold" /></Link><button className="share-scan-button" type="button" onClick={sharePallos}>{shared ? <><Copy />Link copied</> : <><ShareNetwork />Share the free scan</>}</button></div>
        </div>}
      </div>
    </div>
  </section>;
}
