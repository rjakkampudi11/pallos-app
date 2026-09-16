import type { Metadata } from "next";

export const metadata: Metadata = { title: "Login | Pallos", description: "Log in to your private Pallos workspace.", robots: { index: false, follow: false, nocache: true } };

export default function LoginLayout({ children }: { children: React.ReactNode }) { return children; }
