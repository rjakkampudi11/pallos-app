import type { Metadata } from "next";
import { LegalShell } from "../components/legal-shell";

export const metadata: Metadata = { title: "Privacy Policy | Pallos Agent", description: "How Pallos Agent handles waitlist information, sandbox data, and future product data.", alternates: { canonical: "/privacy" } };

export default function Privacy() {
  return <LegalShell eyebrow="PRIVACY" title="Your data should be as understandable as your findings." lead="This policy explains what the Pallos website and development sandbox collect today, what they do not collect, and how to contact us about your information.">
    <section className="legal-callout"><h2>The short version</h2><p>The public website collects information you intentionally submit to the private-beta tester form. Signed-in users can choose repositories for read-only scanning or add JSON endpoints for monitoring. Pallos does not silently change or deploy customer code.</p></section>
    <section><h2>Information we collect</h2><p>When you request tester access, we may receive your email address, preferred AI coding tool, project description, and an optional public or staging URL. Signed-in product use may also create account, repository, scan, finding, monitor, check, incident, and security-event records. We receive ordinary technical information needed to operate and protect the service, such as request time and basic error logs.</p></section>
    <section><h2>How we use information</h2><ul><li>Manage private-beta interest and communicate about access.</li><li>Understand which product checks and integrations matter to prospective users.</li><li>Operate, troubleshoot, protect, and improve the website.</li><li>Respond to questions or requests you send us.</li></ul></section>
    <section><h2>Live features and demonstrations</h2><p>The workspace includes real account, GitHub scanning, and JSON monitoring features alongside clearly labeled demonstration areas. Repository access is selected through the Pallos GitHub App and uses read-only contents access. Do not place passwords, private keys, customer records, production database credentials, or other confidential material into demonstration fields.</p></section>
    <section><h2>Sharing and selling</h2><p>We do not sell waitlist information. Information may be processed by service providers that help operate the website, email, forms, spreadsheets, hosting, or analytics, only as needed to provide those services.</p></section>
    <section><h2>Retention and your choices</h2><p>We retain waitlist information while it is useful for the private beta or until you ask us to remove it, subject to legitimate operational or legal needs. You may request access, correction, or deletion by emailing pallosagent@gmail.com.</p></section>
    <section><h2>Changes</h2><p>We may update this policy as Pallos adds product capabilities or additional service providers. Material changes will be reflected by a new effective date on this page.</p></section>
  </LegalShell>;
}
