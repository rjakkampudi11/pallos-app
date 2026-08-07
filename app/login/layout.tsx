import type { Metadata } from "next";

export const metadata: Metadata = { title: "Login | Pallos Agent", description: "Log in to your private Pallos Agent workspace.", robots: { index: false, follow: false, nocache: true } };

export default function LoginLayout({ children }: { children: React.ReactNode }) { return children; }
