import Link from "next/link";
import { LegalShell } from "../../components/legal-shell";

export const metadata = { title: "Supabase Security Checklist for AI-Built Apps | Pallos", description: "Check RLS, service-role keys, authentication, storage, functions, and API access before launching a Supabase app.", alternates: { canonical: "/guides/supabase-security-checklist" } };

export default function Page() { return <LegalShell eyebrow="SUPABASE GUIDE" title="Supabase security checklist" lead="A focused review for founders and developers launching an AI-built app on Supabase.">
  <section><h2>Protect privileged keys</h2><p>The anon key is designed for client use with correctly configured policies. The service-role key bypasses Row Level Security and must remain server-only. If a privileged key entered a public bundle or repository, rotate it.</p></section>
  <section><h2>Enable and test Row Level Security</h2><p>Enable RLS for tables exposed through the API. Test select, insert, update, and delete policies as an anonymous user, an ordinary signed-in user, a second user, and an administrator. Verify ownership using trusted authentication claims—not client-submitted user IDs.</p></section>
  <section><h2>Review authentication and account flows</h2><p>Set intended redirect URLs, protect privileged routes on the server, avoid revealing whether an email exists, and review session storage, password-reset behavior, email confirmation, and abuse limits.</p></section>
  <section><h2>Check Storage and Edge Functions</h2><p>Review bucket visibility and object policies separately from database policies. In Edge Functions, validate input, verify authentication and authorization, restrict CORS, keep secrets in environment storage, and avoid returning internal errors.</p></section>
  <section><h2>Verify before production</h2><p>Use a staging project, backups, realistic user roles, and negative tests. A passing automated check is evidence—not a guarantee. <Link href="/methodology">Read Pallos’s scanning methodology</Link> and its stated limits.</p></section>
</LegalShell>; }
