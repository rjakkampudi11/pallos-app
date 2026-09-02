# Live Supabase inspection setup

Apply `supabase/migrations/20260901120000_security_core_expansion.sql` first. The feature reuses `MONITOR_ENCRYPTION_KEY` to encrypt the customer's Supabase management token with AES-256-GCM before storage.

Customers create a Supabase personal access token and enter it with the project reference on the Connections page. Pallos sends read-only catalog queries through the Supabase Management API to inspect live RLS state, policy presence, and unusually broad anonymous privileges. Pallos does not request or store the project's service-role key. Until Supabase OAuth is implemented, customers should use a dedicated token and revoke it when the inspection connection is no longer needed.

Treat the token as sensitive. Keep `MONITOR_ENCRYPTION_KEY` in Vercel's sensitive Production variables, rotate stored connections if that key changes, and disconnect a project when inspection is no longer needed.

The catalog inspection does not prove that a policy is logically correct. Two-account behavioral authorization tests remain a separate future verification step.
