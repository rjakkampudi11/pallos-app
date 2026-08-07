import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://pallosagent.com"),
  title: "Pallos Agent Sandbox",
  description: "Explore Pallos Agent with interactive demo projects, findings, fix prompts, and verification flows.",
  alternates: { canonical: "/home" },
  robots: { index: false, follow: false, nocache: true },
};

export default function AgentLayout({ children }: { children: React.ReactNode }) { return children; }
