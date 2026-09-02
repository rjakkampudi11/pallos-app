"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { ArrowRight, Check, EnvelopeSimple, SignIn, UserPlus } from "@phosphor-icons/react";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"login" | "signup">(() => searchParams.get("mode") === "signup" ? "signup" : "login");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [verificationMessage, setVerificationMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
          displayName: form.get("displayName"),
          rememberMe: mode === "login" && form.get("rememberMe") === "on",
          next: new URLSearchParams(window.location.search).get("next"),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not continue.");
      if (data.verificationRequired) {
        setVerificationEmail(String(form.get("email") || ""));
        setVerificationMessage(data.message || "Check your inbox to verify your email.");
        return;
      }
      const requested = new URLSearchParams(window.location.search).get("next");
      const destination = requested?.startsWith("/") && !requested.startsWith("//") ? requested : "/home";
      router.replace(destination);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not continue.");
    } finally { setSubmitting(false); }
  }

  async function resendVerification() {
    const response = await fetch("/api/auth/resend-verification", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: verificationEmail }) });
    const data = await response.json();
    setVerificationMessage(data.message || data.error || "Could not resend the email.");
  }

  return <main className="login-page">
    <section className="login-story">
      <Link className="agent-brand" href="https://pallosagent.info"><span className="agent-brand-dot" />Pallos Agent</Link>
      <div><span className="eyebrow">SECURE WORKSPACE</span><h1>A second set of eyes for everything your AI just built.</h1><p>Your repositories, scans, monitors, findings, and incidents stay tied to your Pallos account.</p></div>
      <div className="login-steps"><div><span>01</span><strong>Connect</strong><p>Choose a GitHub repository with read-only access or add a JSON endpoint.</p></div><div><span>02</span><strong>Scan</strong><p>Review focused findings with redacted evidence and plain-English context.</p></div><div><span>03</span><strong>Verify</strong><p>Fix the issue, scan again, and confirm what changed.</p></div></div>
    </section>
    <section className="login-panel">
      <div className="login-card">
        {verificationEmail ? <div className="verification-state"><EnvelopeSimple /><span>VERIFY YOUR EMAIL</span><h2>Open the link we sent you.</h2><p>{verificationMessage}</p><strong>{verificationEmail}</strong><button className="run-button" type="button" onClick={resendVerification}>Send another email</button><button className="text-link" type="button" onClick={() => { setVerificationEmail(""); setMode("login"); }}>Back to login</button></div> : <>
        <span>{mode === "login" ? "WELCOME BACK" : "CREATE ACCOUNT"}</span>
        <h2>{mode === "login" ? "Enter your workspace." : "Start your workspace."}</h2>
        <p>{mode === "login" ? "Use your Pallos account to access your private scans and monitors." : "Create an account to try the read-only GitHub scanner and API monitor."}</p>
        <div className="auth-mode-switch"><button className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setError(""); }}>Log in</button><button className={mode === "signup" ? "active" : ""} onClick={() => { setMode("signup"); setError(""); }}>Create account</button></div>
        <form onSubmit={submit}>
          {mode === "signup" && <label>Display name<input name="displayName" autoComplete="name" placeholder="Your name" required /></label>}
          <label>Work email<input name="email" type="email" autoComplete="email" placeholder="you@company.com" required /></label>
          <label>Password<input name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder="At least 8 characters" minLength={8} required /></label>
          {mode === "login" && <label className="remember-me"><input name="rememberMe" type="checkbox" /><span>Remember me for 30 days</span></label>}
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="run-button" disabled={submitting}>{submitting ? "Please wait…" : mode === "login" ? <><SignIn />Log in <ArrowRight /></> : <><UserPlus />Create account <ArrowRight /></>}</button>
        </form>
        <div className="login-help"><span><Check /> Verified email · server session</span><div><Link href="https://pallosagent.info/security">Security</Link><Link href="https://pallosagent.info">About Pallos</Link></div></div>
        </>}
      </div>
    </section>
  </main>;
}

export default function LoginPage() {
  return <Suspense fallback={<main className="login-page"><section className="login-panel"><div className="login-card">Loading secure access…</div></section></main>}><LoginContent /></Suspense>;
}
