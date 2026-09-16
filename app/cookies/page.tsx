import { LegalShell } from "../components/legal-shell";

export const metadata = { title: "Cookie Policy | Pallos", description: "How Pallos uses necessary, analytics, and advertising cookies.", alternates: { canonical: "/cookies" } };

export default function CookiesPage() { return <LegalShell eyebrow="LEGAL" title="Cookie Policy" lead="You control analytics and advertising technologies. Necessary storage stays on so Pallos can work securely.">
  <section><h2>What cookies are</h2><p>Cookies and similar browser storage remember information about a visit. Some are required for a requested service; others measure usage or advertising only after consent.</p></section>
  <section><h2>Necessary storage</h2><p>Pallos may use <code>pallos-access-token</code>, <code>pallos-refresh-token</code>, and <code>pallos-remember-me</code> to protect account access, plus <code>pallos-cookie-consent-v1</code> to remember choices. These are not used for behavioral advertising.</p></section>
  <section><h2>Analytics</h2><p>If you allow Analytics, Google Analytics may set identifiers such as <code>_ga</code> and <code>_ga_*</code> to measure visits, interactions, devices, and performance. These commonly last up to two years unless deleted sooner or configured differently.</p></section>
  <section><h2>Advertising and behavioral use</h2><p>If you allow Advertising, Google technologies may measure campaigns, connect interactions across visits or devices, and support personalized or behavioral advertising. Pallos does not enable these signals before consent.</p></section>
  <section><h2>Manage or withdraw consent</h2><p>Select Accept all, Reject non-essential, or Customize in the banner. Reopen choices anytime with the Cookie settings button at the bottom of the page. Withdrawing stops future optional tracking on Pallos; you may also clear existing cookies in your browser.</p></section>
  <section><h2>Updates and contact</h2><p>We may update this policy as our tools change. The effective date appears above. Questions: pallosagent@gmail.com.</p></section>
</LegalShell>; }
