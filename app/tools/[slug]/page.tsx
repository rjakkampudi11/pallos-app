import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle, GithubLogo, LockKey, ShieldCheck, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { getSecurityTool, securityTools } from "../tool-content";
import "../tools.css";

type ToolPageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return securityTools.map((tool) => ({ slug: tool.slug }));
}

export async function generateMetadata({ params }: ToolPageProps): Promise<Metadata> {
  const { slug } = await params;
  const tool = getSecurityTool(slug);
  if (!tool) return {};
  return {
    title: `${tool.eyebrow.replace("FREE ", "")} | Pallos Agent`,
    description: tool.description,
    alternates: { canonical: `/tools/${tool.slug}` },
    openGraph: { title: tool.title, description: tool.description, url: `https://pallosagent.com/tools/${tool.slug}` },
  };
}

export default async function SecurityToolPage({ params }: ToolPageProps) {
  const { slug } = await params;
  const tool = getSecurityTool(slug);
  if (!tool) notFound();

  const faqData = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: tool.questions.map(([question, answer]) => ({ "@type": "Question", name: question, acceptedAnswer: { "@type": "Answer", text: answer } })) };

  return <main className="tool-page">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqData) }} />
    <header className="tool-nav"><nav><Link href="/" className="tool-brand"><span />Pallos Agent</Link><div><Link href="/tools">All tools</Link><Link href="/proof">Proof Lab</Link><Link href="/scan" className="tool-nav-cta">Scan a repository</Link></div></nav></header>
    <section className="tool-hero">
      <div className="tool-kicker"><ShieldCheck weight="fill" />{tool.eyebrow}</div>
      <h1>{tool.title}</h1><p>{tool.lead}</p>
      <div className="tool-actions"><Link href="/scan">Scan a public repository <ArrowRight weight="bold" /></Link><Link href="/methodology">See how scoring works</Link></div>
      <div className="tool-trust"><span><LockKey weight="fill" />Read-only</span><span><CheckCircle weight="fill" />No account required</span><span><CheckCircle weight="fill" />Secret values stay hidden</span></div>
    </section>
    <section className="tool-explainer">
      <article><span>WHAT IT LOOKS FOR</span><h2>Focused signals with file-level evidence.</h2><ul>{tool.signals.map((signal) => <li key={signal}><CheckCircle weight="fill" /><span>{signal}</span></li>)}</ul></article>
      <article className="tool-limit-card"><span>WHAT IT CANNOT PROVE</span><h2>Unknown stays unknown.</h2><ul>{tool.limits.map((limit) => <li key={limit}><WarningCircle weight="fill" /><span>{limit}</span></li>)}</ul></article>
    </section>
    <section className="tool-process"><div><span>HOW THE FREE SCAN WORKS</span><h2>Paste. Review. Fix.</h2></div><ol><li><b>01</b><h3>Paste a public GitHub URL</h3><p>Use code you own or are authorized to review.</p></li><li><b>02</b><h3>Read the evidence</h3><p>See the affected file, risk, explanation, and practical fix direction.</p></li><li><b>03</b><h3>Make the change yourself</h3><p>Pallos never pushes or edits your repository.</p></li></ol></section>
    <section className="tool-faq"><div><span>COMMON QUESTIONS</span><h2>What this check means.</h2></div><div>{tool.questions.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div></section>
    <section className="tool-final-cta"><GithubLogo weight="fill" /><div><span>FREE · PUBLIC REPOSITORIES</span><h2>Check the code before users find the mistake.</h2><p>No payment, account, or installation. The repository stays unchanged.</p></div><Link href="/scan">Start the scan <ArrowRight weight="bold" /></Link></section>
  </main>;
}
