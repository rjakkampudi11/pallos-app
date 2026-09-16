import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle, GithubLogo, ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import { securityTools } from "./tool-content";
import "./tools.css";

export const metadata: Metadata = {
  title: "Free Code Security Tools | Pallos Agent",
  description: "Free, no-account security checks for public GitHub, Next.js, and Supabase repositories with evidence and fix directions.",
  alternates: { canonical: "/tools" },
};

export default function ToolsPage() {
  return <main className="tool-page">
    <header className="tool-nav"><nav><Link href="/" className="tool-brand"><span />Pallos Agent</Link><div><Link href="/proof">Proof Lab</Link><Link href="/scan" className="tool-nav-cta">Scan a repository</Link></div></nav></header>
    <section className="tools-index-hero"><div className="tool-kicker"><ShieldCheck weight="fill" />FREE REPOSITORY SECURITY TOOLS</div><h1>Start with the risk you need to check.</h1><p>Each tool uses the same read-only Pallos scanner, but explains the relevant checks, evidence, and limits before you submit a public repository.</p></section>
    <section className="tools-index-grid" aria-label="Free security tools">{securityTools.map((tool) => <article key={tool.slug}><GithubLogo weight="fill" /><span>{tool.eyebrow}</span><h2>{tool.title}</h2><p>{tool.description}</p><Link href={`/tools/${tool.slug}`}>Open this tool <ArrowRight weight="bold" /></Link></article>)}</section>
    <section className="tool-index-cta"><CheckCircle weight="fill" /><div><h2>Already have the repository URL?</h2><p>Paste it into the free scanner. No account, payment, or GitHub connection is required for public code.</p></div><Link href="/scan">Run a free scan <ArrowRight weight="bold" /></Link></section>
  </main>;
}
