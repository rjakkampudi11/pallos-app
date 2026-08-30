import Link from "next/link";

export const dynamic = "force-dynamic";

export default function Projects() {
  return <main className="shell legal-page"><div className="prototype-banner">Prototype simulation — not connected to real customer systems.</div><div className="eyebrow">PROJECTS</div><h1>Your demo projects</h1><div className="project-list"><Link href="/app/projects/unsafe-store"><b>Unsafe Store Demo</b><span>Next.js · Supabase · Score 72</span></Link><Link href="/app/projects/safe-notes"><b>Safe Notes Demo</b><span>Next.js · Supabase · Score 100</span></Link></div></main>;
}
