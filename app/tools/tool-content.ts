export type SecurityTool = {
  slug: string;
  eyebrow: string;
  title: string;
  description: string;
  lead: string;
  signals: string[];
  limits: string[];
  questions: Array<[string, string]>;
};

export const securityTools: SecurityTool[] = [
  {
    slug: "github-secret-scanner",
    eyebrow: "FREE GITHUB SECRET SCANNER",
    title: "Check a public GitHub repository for exposed secrets.",
    description: "Scan a public GitHub repository for committed credential patterns, exposed API keys, and client/server secret boundary mistakes. No account required.",
    lead: "Pallos reads the public source at one commit, prioritizes security-sensitive files, and reports the file, line, evidence, and a practical fix direction without displaying secret values.",
    signals: [
      "Credential-like values committed in source code",
      "Server-only keys referenced from browser-facing files",
      "Environment-variable patterns that may expose private values",
      "Placeholder and example credentials separated from stronger signals",
    ],
    limits: [
      "It cannot prove that a detected credential is active.",
      "It does not search private repositories without an authorized GitHub connection.",
      "A clean static scan is not a security guarantee or a replacement for secret rotation.",
    ],
    questions: [
      ["Does Pallos show the secret value?", "No. Reports identify the location and risk pattern without printing the detected credential value."],
      ["What should I do if a real key is found?", "Revoke or rotate it first, remove it from current code and relevant Git history, then move it to server-only secret storage."],
      ["Can I scan a private repository?", "Yes, after signing in and granting the Pallos GitHub App read-only access to repositories you select."],
    ],
  },
  {
    slug: "supabase-rls-checker",
    eyebrow: "SUPABASE RLS CHECKER",
    title: "Find Supabase access rules that deserve a closer look.",
    description: "Review a public repository for risky Supabase Row Level Security policies, service-role key exposure, and weak access assumptions.",
    lead: "Pallos looks for Supabase migrations, policies, client setup, and route code that can reveal overly broad database access or a dangerous trust boundary.",
    signals: [
      "Permissive RLS policy expressions that may allow every row",
      "Service-role or privileged credentials placed in client code",
      "Database access that relies only on the browser to enforce permissions",
      "Missing evidence for policy coverage, kept visible as untested instead of passed",
    ],
    limits: [
      "Static source cannot confirm the policies currently deployed in your Supabase project.",
      "Pallos does not log into your database during a public scan.",
      "Complex SQL and application-specific authorization still require human review and runtime tests.",
    ],
    questions: [
      ["Does this connect to my Supabase database?", "No. The free public scan reviews repository source only and does not require database credentials."],
      ["Can it prove RLS is enabled on every table?", "Only when the repository contains enough migration or policy evidence. Anything it cannot prove remains explicitly untested."],
      ["What stacks are supported?", "The current scanner is strongest on JavaScript, TypeScript, Next.js, Supabase configuration, SQL migrations, and common API route patterns."],
    ],
  },
  {
    slug: "nextjs-security-scanner",
    eyebrow: "NEXT.JS SECURITY SCANNER",
    title: "Review a Next.js repository before you launch.",
    description: "Scan a public Next.js repository for exposed secrets, weak authorization, risky routes, webhook mistakes, and unsafe server/client boundaries.",
    lead: "Pallos prioritizes App Router and API code, authentication checks, configuration, webhooks, and browser-facing files, then explains each signal in plain English.",
    signals: [
      "Sensitive API routes that appear to check login without checking role or ownership",
      "Server-only operations or private values placed in client components",
      "Webhook handlers missing recognizable signature-verification evidence",
      "Dynamic code execution and credentialed cross-origin access patterns",
    ],
    limits: [
      "The public scan is capped and prioritizes security-sensitive files.",
      "Static analysis cannot observe production configuration, traffic, or runtime behavior.",
      "Framework conventions and custom authorization code can require a manual review.",
    ],
    questions: [
      ["Does Pallos change my code?", "No. The scanner is read-only. It gives evidence and fix directions while you control every change."],
      ["Does it support the App Router?", "Yes. Pallos reviews common App Router, route-handler, server/client boundary, and environment-variable patterns."],
      ["Is a high score proof that the app is secure?", "No. The score summarizes completed checks. Untested areas stay visible and are not silently counted as passes."],
    ],
  },
];

export function getSecurityTool(slug: string) {
  return securityTools.find((tool) => tool.slug === slug);
}
