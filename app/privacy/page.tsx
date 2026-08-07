import type { Metadata } from "next";
import { LegalShell } from "../components/legal-shell";

export const metadata: Metadata = { title: "Privacy Policy | Pallos Agent", description: "How Pallos Agent handles waitlist information, sandbox data, and future product data.", alternates: { canonical: "/privacy" } };

export default function Privacy() {
  return <LegalShell eyebrow="PRIVACY" title="Your data should be as understandable as your findings." lead="This policy explains what the Pallos website and development sandbox collect today, what they do not collect, and how to contact us about your information.">
    <section className="legal-callout"><h2>The short version</h2><p>The public website collects information you intentionally submit to the private-beta waitlist. The current workspace is a demonstration using sample data; it does not connect to or scan your live repositories.</p></section>
    <section><h2>Information we collect</h2><p>When you join the waitlist, we may receive your name, email address, role, preferred AI coding tool, project stage, concerns, and the description you provide. We also receive ordinary technical information needed to operate and protect the website, such as request time and basic error logs.</p></section>
    <section><h2>How we use information</h2><ul><li>Manage private-beta interest and communicate about access.</li><li>Understand which product checks and integrations matter to prospective users.</li><li>Operate, troubleshoot, protect, and improve the website.</li><li>Respond to questions or requests you send us.</li></ul></section>
    <section><h2>Current sandbox limitations</h2><p>The workspace at pallosagent.com currently uses illustrative projects, findings, connections, and scan results. Do not submit source code, passwords, private keys, customer records, production database credentials, or other confidential material to the demo.</p></section>
    <section><h2>Sharing and selling</h2><p>We do not sell waitlist information. Information may be processed by service providers that help operate the website, email, forms, spreadsheets, hosting, or analytics, only as needed to provide those services.</p></section>
    <section><h2>Retention and your choices</h2><p>We retain waitlist information while it is useful for the private beta or until you ask us to remove it, subject to legitimate operational or legal needs. You may request access, correction, or deletion by emailing pallosagent@gmail.com.</p></section>
    <section><h2>Changes</h2><p>We may update this policy as Pallos adds real accounts, repository connections, scanning, or additional service providers. Material changes will be reflected by a new effective date on this page.</p></section>
  </LegalShell>;
}
