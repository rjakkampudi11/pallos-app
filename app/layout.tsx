import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./agent/agent.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://pallosagent.info"),
  title: "Pallos Agent | Understand Risk in AI-Built Apps",
  description: "Pallos helps vibecoders catch exposed keys, unsafe database access, risky admin routes, and confusing AI-generated changes before launch.",
  applicationName: "Pallos Agent",
  category: "Developer tools",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "https://pallosagent.info",
    siteName: "Pallos Agent",
    title: "Pallos Agent | Understand Risk in AI-Built Apps",
    description: "A clear second pass for exposed keys, unsafe access, risky routes, and AI-generated changes before launch.",
    images: [{ url: "/og-pallos-agent.png", width: 1731, height: 909, alt: "Pallos Agent — Know what your AI changed." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pallos Agent | Understand Risk in AI-Built Apps",
    description: "A clear second pass for exposed keys, unsafe access, risky routes, and AI-generated changes before launch.",
    images: ["/og-pallos-agent.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
