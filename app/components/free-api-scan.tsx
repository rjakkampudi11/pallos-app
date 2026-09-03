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
        <div className="eyebrow"><span className="pulse" />TRY IT NOW</div>
        <h2>Test Pallos without connecting your project.</h2>
        <p>Use our safe demo or paste a public JSON API address. Pallos checks whether it works and shows the shape of the response.</p>
        <div className="free-scan-privacy"><LockKey weight="fill" /><span><strong>Your data stays hidden.</strong> The result shows field names and types, never the returned values.</span></div>
      </div>

      <div className="free-scan-card">
        {!result && <form onSubmit={runScan}>
          <div className="scan-form-heading"><BracketsCurly /><div><span>NO ACCOUNT NEEDED</span><h3>Try the safe demo first</h3></div></div>
          <label htmlFor="free-scan-url">Public API address</label>
          <div className="free-scan-input-row"><input id="free-scan-url" type="url" required value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://your-app.com/api/status" autoComplete="url" /><button className="button" disabled={state === "scanning"}>{state === "scanning" ? <ArrowClockwise className="spin" /> : <ArrowRight weight="bold" />}{state === "scanning" ? "Checking…" : "Run free scan"}</button></div>
          <button className="sample-api-button" type="button" onClick={() => setUrl(`${window.location.protocol === "https:" ? window.location.origin : "https://pallosagent.info"}/api/training/profile`)}>Fill in the safe demo for me</button>
          <div className="scan-boundaries"><span><Check />Safe demo is reusable</span><span><Check />Public addresses only</span><span><Check />Values stay hidden</span></div>
          {state === "error" && <div className="free-scan-error" role="alert"><WarningCircle /><span>{message}{scanUsed && <Link href="https://pallosagent.com/login?mode=signup&next=/monitor">Create a free account to continue <ArrowRight /></Link>}</span></div>}
        </form>}

        {result && <div className={`free-scan-result ${result.outcome}`} aria-live="polite">
          <div className="scan-result-head"><span className="scan-result-icon">{result.outcome === "healthy" ? <CheckCircle weight="fill" /> : <WarningCircle weight="fill" />}</span><div><span>SCAN COMPLETE</span><h3>{result.hostname}</h3><p>{result.message}</p></div><em>{result.statusCode ? `HTTP ${result.statusCode}` : "NO RESPONSE"}</em></div>
          <div className="scan-result-metrics"><div><span>RESPONSE</span><strong>{result.durationMs} ms</strong></div><div><span>JSON ROOT</span><strong>{result.rootType || "Not detected"}</strong></div><div><span>FIELDS MAPPED</span><strong>{result.fieldCount}</strong></div></div>
          <div className="scan-checks"><span className={result.checks.httpSuccess ? "pass" : "fail"}>{result.checks.httpSuccess ? <Check /> : <WarningCircle />}Successful HTTP response</span><span className={result.checks.validJson ? "pass" : "fail"}>{result.checks.validJson ? <Check /> : <WarningCircle />}Valid JSON detected</span><span className="pass"><Check />Public HTTPS address</span></div>
          {result.fields.length > 0 && <div className="scan-schema"><div><span>STRUCTURE PREVIEW</span><small>Response values are never displayed</small></div>{result.fields.map((field) => <p key={field.path}><code>{field.path}</code><em>{field.type}</em></p>)}</div>}
          <div className="free-scan-next"><div><span>NEXT STEP</span><strong>Save this working response, then let Pallos warn you if it changes or breaks.</strong></div><Link className="button" href="https://pallosagent.com/login?mode=signup&next=/monitor">Save and monitor it <ArrowRight weight="bold" /></Link><div className="scan-result-actions"><button className="share-scan-button" type="button" onClick={() => { setResult(null); setState("idle"); setMessage(""); }}>Run another check</button><button className="share-scan-button" type="button" onClick={sharePallos}>{shared ? <><Copy />Link copied</> : <><ShareNetwork />Share this check</>}</button></div></div>
        </div>}
      </div>
    </div>
  </section>;
}
