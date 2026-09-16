import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import "./agent/agent.css";
import "./improvements.css";
import "./redesign.css";
import { ConsentAwareGoogleAnalytics, CookieConsent } from "./components/cookie-consent";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://pallosagent.com"),
  title: "Security Checks for AI-Built Apps | Pallos",
  description: "Review JavaScript, TypeScript, Next.js, and Supabase projects for exposed secrets, weak access controls, unsafe routes, and other launch-time security mistakes.",
  applicationName: "Pallos",
  category: "Developer tools",
  keywords: ["AI code security scanner", "GitHub security scanner", "Next.js security scanner", "Supabase security checker", "AI-generated code security", "exposed API key scanner"],
  creator: "Pallos",
  publisher: "Pallos",
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
    siteName: "Pallos",
    title: "Security Checks for AI-Built Apps | Pallos",
    description: "Review exposed secrets, weak access controls, unsafe routes, and other launch-time security mistakes.",
    images: [{ url: "/og-pallos-agent.png", width: 1200, height: 630, alt: "Pallos — security checks for AI-built apps." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Security Checks for AI-Built Apps | Pallos",
    description: "Review exposed secrets, weak access controls, unsafe routes, and other launch-time security mistakes.",
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
      className={`${inter.variable} ${jetBrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <CookieConsent />
        <ConsentAwareGoogleAnalytics />
      </body>
    </html>
  );
}
