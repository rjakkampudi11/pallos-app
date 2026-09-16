import type { Metadata } from "next";
import { PublicRepositoryScanner } from "./public-repository-scanner";
import "./scan.css";

export const metadata: Metadata = {
  title: "Free Public GitHub Security Scan | Pallos",
  description: "Paste a public GitHub repository URL and get a plain-English Pallos security scan with evidence and fix directions. No account required.",
  alternates: { canonical: "/scan" },
};

type PublicScanPageProps = { searchParams: Promise<{ repo?: string | string[] }> };

export default async function PublicScanPage({ searchParams }: PublicScanPageProps) {
  const { repo } = await searchParams;
  return <PublicRepositoryScanner initialRepositoryUrl={Array.isArray(repo) ? repo[0] || "" : repo || ""} />;
}
