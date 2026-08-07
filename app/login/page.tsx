"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ArrowRight, Check, SignIn, UserPlus } from "@phosphor-icons/react";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

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
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not continue.");
      const requested = new URLSearchParams(window.location.search).get("next");
      const destination = requested?.startsWith("/") && !requested.startsWith("//") ? requested : "/home";
      router.replace(destination);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not continue.");
    } finally { setSubmitting(false); }
  }

  return <main className="login-page">
    <section className="login-story">
      <Link className="agent-brand" href="https://pallosagent.info"><span className="agent-brand-dot" />Pallos Agent</Link>
      <div><span className="eyebrow">SECURE WORKSPACE</span><h1>A second set of eyes for everything your AI just built.</h1><p>Your monitors, response history, and incidents are separated from every other Pallos account.</p></div>
      <div className="login-steps"><div><span>01</span><strong>Connect</strong><p>Add a public or authenticated JSON endpoint.</p></div><div><span>02</span><strong>Compare</strong><p>Save a baseline and detect contract changes.</p></div><div><span>03</span><strong>Resolve</strong><p>Keep serious changes visible until reviewed.</p></div></div>
    </section>
    <section className="login-panel">
      <div className="login-card">
        <span>{mode === "login" ? "WELCOME BACK" : "CREATE ACCOUNT"}</span>
        <h2>{mode === "login" ? "Enter your workspace." : "Start your workspace."}</h2>
        <p>{mode === "login" ? "Use your Pallos account to access your private monitors." : "Create an account with an email and a password of at least eight characters."}</p>
        <div className="auth-mode-switch"><button className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setError(""); }}>Log in</button><button className={mode === "signup" ? "active" : ""} onClick={() => { setMode("signup"); setError(""); }}>Create account</button></div>
        <form onSubmit={submit}>
          {mode === "signup" && <label>Display name<input name="displayName" autoComplete="name" placeholder="Your name" required /></label>}
          <label>Work email<input name="email" type="email" autoComplete="email" placeholder="you@company.com" required /></label>
          <label>Password<input name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder="At least 8 characters" minLength={8} required /></label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="run-button" disabled={submitting}>{submitting ? "Please wait…" : mode === "login" ? <><SignIn />Log in <ArrowRight /></> : <><UserPlus />Create account <ArrowRight /></>}</button>
        </form>
        <div className="login-help"><span><Check /> Server-validated session</span><Link href="https://pallosagent.info">About Pallos</Link></div>
      </div>
    </section>
  </main>;
}
