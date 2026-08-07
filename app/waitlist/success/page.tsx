import Link from "next/link";

export default function Success() {
  return (
    <main className="shell legal-page">
      <p className="eyebrow">WAITLIST CONFIRMED</p>
      <h1>You’re on the list.</h1>
      <p>Thanks for your interest in the Pallos Agent private beta. We’ll be in touch as testing expands.</p>
      <Link className="button" href="/">Back to Pallos Agent</Link>
    </main>
  );
}
