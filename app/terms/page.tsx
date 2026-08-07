import type { Metadata } from "next";
import { LegalShell } from "../components/legal-shell";

export const metadata: Metadata = { title: "Terms of Use | Pallos Agent", description: "Terms governing the Pallos Agent website, private-beta waitlist, and development sandbox.", alternates: { canonical: "/terms" } };

export default function Terms() {
  return <LegalShell eyebrow="TERMS" title="Clear expectations for an early product." lead="These terms cover the Pallos website, private-beta waitlist, and interactive development sandbox available today.">
    <section className="legal-callout"><h2>Important beta notice</h2><p>Pallos is under development. Current scan results and connected-service states are simulated unless a page clearly says otherwise. The sandbox is for evaluation and does not provide a guarantee that an application is secure.</p></section>
    <section><h2>Using Pallos</h2><p>You may use the public website and sandbox for lawful evaluation, feedback, and private-beta interest. You may not attempt to disrupt the service, gain unauthorized access, introduce malicious code, impersonate another person, or use the service to violate another party&apos;s rights.</p></section>
    <section><h2>Your responsibility</h2><p>You remain responsible for your application, accounts, deployments, data, and decisions. Review every proposed fix before applying it, maintain backups, protect credentials, and use qualified professional review when your product or users require it.</p></section>
    <section><h2>No security guarantee</h2><p>Pallos is designed to identify a focused set of mistakes and explain evidence. No scanner finds every vulnerability, and a clear scan does not mean an application is free from security, privacy, reliability, or compliance risk.</p></section>
    <section><h2>Feedback and submissions</h2><p>You keep ownership of information you submit. You allow us to use non-confidential feedback to improve Pallos. Do not submit material you do not have permission to share.</p></section>
    <section><h2>Availability</h2><p>Features may change, pause, or be removed during development. We may limit access when needed to protect the service, users, or third parties.</p></section>
    <section><h2>Disclaimers and liability</h2><p>The website and sandbox are provided on an “as available” basis to the extent permitted by law. Pallos is not responsible for decisions made solely from demo content, incomplete findings, or unreviewed generated instructions.</p></section>
    <section><h2>Questions</h2><p>Email pallosagent@gmail.com with questions about these terms or the private beta.</p></section>
  </LegalShell>;
}
