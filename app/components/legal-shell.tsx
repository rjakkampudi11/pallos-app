import Link from "next/link";
import type { ReactNode } from "react";

export function LegalShell({ eyebrow, title, lead, children }: { eyebrow: string; title: string; lead: string; children: ReactNode }) {
  return <main className="legal-site">
    <header className="legal-header"><nav className="shell legal-nav" aria-label="Legal page navigation"><Link className="brand" href="/"><span className="brand-dot" />Pallos</Link><Link href="/">Back to Pallos</Link></nav></header>
    <article className="shell legal-main"><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p className="legal-lead">{lead}</p><div className="legal-meta"><span>Effective September 8, 2026</span><span>Contact: pallosagent@gmail.com</span></div><div className="legal-content">{children}</div></article>
    <footer className="legal-footer"><div className="shell"><span>© 2026 Pallos</span><nav><Link href="/guides/ai-code-security-checklist">Security guide</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/cookies">Cookies</Link><a href="mailto:pallosagent@gmail.com">Email us</a></nav></div></footer>
  </main>;
}
