import type { Metadata } from "next";
import { PublicRepositoryScanner } from "./public-repository-scanner";
import "./scan.css";

export const metadata: Metadata = {
  title: "Free Public GitHub Security Scan | Pallos Agent",
  description: "Paste a public GitHub repository URL and get a plain-English Pallos security scan with evidence and fix directions. No account required.",
  alternates: { canonical: "/scan" },
};

export default function PublicScanPage() {
  return <PublicRepositoryScanner />;
}
