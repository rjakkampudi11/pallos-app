import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./agent/agent.css";
import "./improvements.css";
import { ConsentAwareGoogleAnalytics, CookieConsent } from "./components/cookie-consent";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://pallosagent.com"),
  title: "AI Code Security Scanner for GitHub | Pallos Agent",
  description: "Scan AI-generated JavaScript, TypeScript, Next.js, and Supabase code for exposed secrets, unsafe access, and risky routes with plain-English results.",
  applicationName: "Pallos Agent",
  category: "Developer tools",
  keywords: ["AI code security scanner", "GitHub security scanner", "Next.js security scanner", "Supabase security checker", "AI-generated code security", "exposed API key scanner"],
  creator: "Pallos Agent",
  publisher: "Pallos Agent",
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
  icons: {
    icon: [{ url: "/pallos-icon.svg", type: "image/svg+xml" }],
    shortcut: "/pallos-icon.svg",
    apple: "/pallos-icon.svg",
  },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "https://pallosagent.com",
    siteName: "Pallos Agent",
    title: "AI Code Security Scanner for GitHub | Pallos Agent",
    description: "A clear second pass for exposed keys, unsafe access, risky routes, and AI-generated changes before launch.",
    images: [{ url: "/og-pallos-agent.png", width: 1731, height: 909, alt: "Pallos Agent — Know what your AI changed." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Code Security Scanner for GitHub | Pallos Agent",
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
      <body className="min-h-full flex flex-col">
        {children}
        <CookieConsent />
        <ConsentAwareGoogleAnalytics />
      </body>
    </html>
  );
}
