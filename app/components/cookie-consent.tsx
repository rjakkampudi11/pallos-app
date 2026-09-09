"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useState } from "react";

type Consent = { analytics: boolean; advertising: boolean };
const STORAGE_KEY = "pallos-cookie-consent-v1";
const EVENT_NAME = "pallos-cookie-consent-change";
const denied: Consent = { analytics: false, advertising: false };

function readConsent(): Consent | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (!value) return null;
    const parsed = JSON.parse(value) as Partial<Consent>;
    return { analytics: parsed.analytics === true, advertising: parsed.advertising === true };
  } catch { return null; }
}

function saveConsent(value: Consent) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: value }));
}

declare global {
  interface Window { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void; }
}

export function CookieConsent() {
  const [consent, setConsent] = useState<Consent | null>(null);
  const [ready, setReady] = useState(false);
  const [customizing, setCustomizing] = useState(false);

  useEffect(() => {
    setConsent(readConsent());
    setReady(true);
    const open = () => setCustomizing(true);
    window.addEventListener("pallos-open-cookie-settings", open);
    return () => window.removeEventListener("pallos-open-cookie-settings", open);
  }, []);

  function choose(value: Consent) {
    saveConsent(value);
    setConsent(value);
    setCustomizing(false);
  }

  if (!ready) return null;
  return <>
    {!consent || customizing ? <div className="cookie-consent" role="dialog" aria-modal="true" aria-labelledby="cookie-title" aria-describedby="cookie-description">
      <div className="cookie-consent-copy">
        <span>YOUR PRIVACY</span><h2 id="cookie-title">Choose how Pallos uses cookies</h2>
        <p id="cookie-description">Necessary cookies keep accounts secure. With your permission, Google Analytics helps us understand usage, and advertising cookies may measure or personalize campaigns. You can change this anytime.</p>
        <Link href="/cookies">Read the Cookie Policy</Link>
      </div>
      {customizing ? <div className="cookie-choices">
        <label><span><strong>Necessary</strong><small>Authentication, security, and saved consent choices.</small></span><input type="checkbox" checked disabled /></label>
        <label><span><strong>Analytics</strong><small>Google Analytics usage and performance measurement.</small></span><input type="checkbox" checked={consent?.analytics ?? false} onChange={(event) => setConsent({ ...(consent ?? denied), analytics: event.target.checked })} /></label>
        <label><span><strong>Advertising</strong><small>Campaign measurement and behavioral advertising features.</small></span><input type="checkbox" checked={consent?.advertising ?? false} onChange={(event) => setConsent({ ...(consent ?? denied), advertising: event.target.checked })} /></label>
      </div> : null}
      <div className="cookie-actions">
        <button className="cookie-secondary" onClick={() => choose(denied)}>Reject non-essential</button>
        {customizing ? <button className="cookie-primary" onClick={() => choose(consent ?? denied)}>Save choices</button> : <button className="cookie-secondary" onClick={() => setCustomizing(true)}>Customize</button>}
        <button className="cookie-primary" onClick={() => choose({ analytics: true, advertising: true })}>Accept all</button>
      </div>
    </div> : <button className="cookie-settings-button" onClick={() => setCustomizing(true)}>Cookie settings</button>}
  </>;
}

export function ConsentAwareGoogleAnalytics() {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const [consent, setConsent] = useState<Consent | null>(null);
  useEffect(() => {
    const update = (event?: Event) => {
      const value = event instanceof CustomEvent ? event.detail as Consent : readConsent();
      setConsent(value);
      if (window.gtag && value) window.gtag("consent", "update", {
        analytics_storage: value.analytics ? "granted" : "denied",
        ad_storage: value.advertising ? "granted" : "denied",
        ad_user_data: value.advertising ? "granted" : "denied",
        ad_personalization: value.advertising ? "granted" : "denied",
      });
    };
    update();
    window.addEventListener(EVENT_NAME, update);
    return () => window.removeEventListener(EVENT_NAME, update);
  }, []);
  if (!measurementId || (!consent?.analytics && !consent?.advertising)) return null;
  const advertising = consent.advertising;
  return <>
    <Script src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`} strategy="afterInteractive" />
    <Script id="pallos-google-analytics" strategy="afterInteractive">{`
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      window.gtag = gtag;
      gtag('consent', 'default', {analytics_storage:'${consent.analytics ? "granted" : "denied"}',ad_storage:'${advertising ? "granted" : "denied"}',ad_user_data:'${advertising ? "granted" : "denied"}',ad_personalization:'${advertising ? "granted" : "denied"}',wait_for_update:500});
      gtag('js', new Date());
      gtag('config', '${measurementId}', {allow_google_signals:${advertising},allow_ad_personalization_signals:${advertising}});
    `}</Script>
  </>;
}
