import Link from "next/link";
import type { ReactNode } from "react";

export function LegalShell({ eyebrow, title, lead, children }: { eyebrow: string; title: string; lead: string; children: ReactNode }) {
  return <main className="legal-site">
    <header className="legal-header"><nav className="shell legal-nav" aria-label="Legal page navigation"><Link className="brand" href="/"><span className="brand-dot" />Pallos Agent</Link><Link href="/">Back to Pallos</Link></nav></header>
    <article className="shell legal-main"><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p className="legal-lead">{lead}</p><div className="legal-meta"><span>Effective August 3, 2026</span><span>Contact: pallosagent@gmail.com</span></div><div className="legal-content">{children}</div></article>
    <footer className="legal-footer"><div className="shell"><span>© 2026 Pallos Agent</span><nav><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><a href="mailto:pallosagent@gmail.com">Email us</a></nav></div></footer>
  </main>;
}
