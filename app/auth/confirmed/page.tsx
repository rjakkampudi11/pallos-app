"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowClockwise, CheckCircle, WarningCircle } from "@phosphor-icons/react";

export default function EmailConfirmedPage() {
  const [state, setState] = useState<"checking" | "success" | "error">("checking");

  useEffect(() => {
    const values = new URLSearchParams(window.location.hash.slice(1));
    const requested = new URLSearchParams(window.location.search).get("next");
    const destination = requested?.startsWith("/") && !requested.startsWith("//") ? requested : "/home";
    const accessToken = values.get("access_token");
    const refreshToken = values.get("refresh_token");
    if (!accessToken || !refreshToken) {
      const errorTimer = window.setTimeout(() => setState("error"), 0);
      return () => window.clearTimeout(errorTimer);
    }
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    void fetch("/api/auth/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accessToken, refreshToken }) }).then((response) => {
      if (!response.ok) throw new Error();
      setState("success");
      window.setTimeout(() => window.location.replace(destination), 700);
    }).catch(() => setState("error"));
  }, []);

  return <main className="login-page"><section className="login-story"><Link className="agent-brand" href="https://pallosagent.info"><span className="agent-brand-dot" />Pallos Agent</Link><div><span className="eyebrow">ACCOUNT VERIFICATION</span><h1>Your workspace stays connected to a real inbox.</h1><p>Email verification reduces fake accounts and protects account recovery.</p></div></section><section className="login-panel"><div className="login-card verification-state">{state === "checking" ? <><ArrowClockwise className="spin" /><span>VERIFYING</span><h2>Checking your link…</h2></> : state === "success" ? <><CheckCircle weight="fill" /><span>VERIFIED</span><h2>Your email is confirmed.</h2><p>Taking you to your workspace now.</p></> : <><WarningCircle weight="fill" /><span>LINK NOT ACCEPTED</span><h2>This verification link is invalid or expired.</h2><p>Return to login and request another verification email.</p><Link className="run-button" href="/login">Return to login</Link></>}</div></section></main>;
}
