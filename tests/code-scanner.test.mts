import assert from "node:assert/strict";
import test from "node:test";
import { scanRepositoryFiles } from "../lib/code-scanner.ts";

test("detects and redacts a committed API key", () => {
  const value = `sk-${"a".repeat(32)}`;
  const findings = scanRepositoryFiles([{ path: "src/config.ts", content: `const key = "${value}";` }]);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].severity, "critical");
  assert.equal(findings[0].line_number, 1);
  assert.equal(findings[0].evidence.includes(value), false);
});

test("detects privileged Supabase key usage in a client module", () => {
  const findings = scanRepositoryFiles([{ path: "app/settings/page.tsx", content: `'use client';\nconst key = process.env.SUPABASE_SERVICE_ROLE_KEY;` }]);
  assert.equal(findings.some((finding) => finding.rule_id === "supabase-service-role-client"), true);
});

test("does not treat explanatory Supabase text as a client-side key reference", () => {
  const findings = scanRepositoryFiles([{ path: "app/findings/page.tsx", content: `'use client';\nconst copy = "SUPABASE_SERVICE_ROLE_KEY should stay on the server";` }]);
  assert.equal(findings.length, 0);
});

test("flags an admin route without an explicit permission check", () => {
  const findings = scanRepositoryFiles([{ path: "app/api/admin/users/route.ts", content: `export async function GET() { return Response.json([]) }` }]);
  assert.equal(findings[0].rule_id, "admin-route-authorization");
});

test("does not flag an admin route with identity and role checks", () => {
  const findings = scanRepositoryFiles([{ path: "app/api/admin/users/route.ts", content: `const user = await getUser(); if (user.role !== "admin") return forbidden();` }]);
  assert.equal(findings.length, 0);
});

test("flags an unconditional Supabase policy", () => {
  const findings = scanRepositoryFiles([{ path: "supabase/migrations/001.sql", content: `create policy "open" on profiles for select using (true);` }]);
  assert.equal(findings[0].rule_id, "supabase-permissive-policy");
});

test("detects and redacts additional provider credentials", () => {
  const awsKey = `AKIA${"A".repeat(16)}`;
  const googleKey = `AIza${"b".repeat(35)}`;
  const slackToken = `xoxb-${"c".repeat(24)}`;
  const findings = scanRepositoryFiles([{ path: "src/credentials.ts", content: `${awsKey}\n${googleKey}\n${slackToken}` }]);
  assert.deepEqual(findings.map((finding) => finding.rule_id), ["secret-aws", "secret-google", "secret-slack"]);
  assert.equal(findings.every((finding) => !finding.evidence.includes(awsKey) && !finding.evidence.includes(googleKey) && !finding.evidence.includes(slackToken)), true);
});

test("flags sensitive NEXT_PUBLIC variables but allows publishable browser keys", () => {
  const findings = scanRepositoryFiles([{ path: "app/page.tsx", content: `process.env.NEXT_PUBLIC_ADMIN_TOKEN;\nprocess.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;` }]);
  assert.deepEqual(findings.map((finding) => finding.rule_id), ["public-sensitive-environment-variable"]);
});

test("ignores sensitive environment-variable examples inside scanner tests", () => {
  const findings = scanRepositoryFiles([{ path: "tests/scanner.test.ts", content: `process.env.NEXT_PUBLIC_ADMIN_TOKEN;` }]);
  assert.equal(findings.length, 0);
});

test("flags a script-readable session cookie", () => {
  const findings = scanRepositoryFiles([{ path: "app/api/login/route.ts", content: `cookies().set("session", token, { httpOnly: false, secure: true });` }]);
  assert.equal(findings.some((finding) => finding.rule_id === "auth-cookie-not-http-only"), true);
});

test("allows an HTTP-only session cookie", () => {
  const findings = scanRepositoryFiles([{ path: "app/api/login/route.ts", content: `cookies().set("session", token, { httpOnly: true, secure: true });` }]);
  assert.equal(findings.length, 0);
});

test("flags wildcard credentialed CORS on an API", () => {
  const findings = scanRepositoryFiles([{ path: "app/api/data/route.ts", content: `return Response.json({}, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Credentials": "true" } });` }]);
  assert.equal(findings.some((finding) => finding.rule_id === "credentialed-wildcard-cors"), true);
});

test("allows credentialed CORS for an explicit origin", () => {
  const findings = scanRepositoryFiles([{ path: "app/api/data/route.ts", content: `return Response.json({}, { headers: { "Access-Control-Allow-Origin": "https://app.example.com", "Access-Control-Allow-Credentials": "true" } });` }]);
  assert.equal(findings.length, 0);
});

test("flags an unsigned Stripe webhook", () => {
  const findings = scanRepositoryFiles([{ path: "app/api/webhooks/stripe/route.ts", content: `export async function POST(request: Request) { return Response.json(await request.json()); }` }]);
  assert.equal(findings.some((finding) => finding.rule_id === "stripe-webhook-signature"), true);
});

test("allows a Stripe webhook that verifies its signature", () => {
  const findings = scanRepositoryFiles([{ path: "app/api/webhooks/stripe/route.ts", content: `const signature = headers().get("stripe-signature"); stripe.webhooks.constructEvent(await request.text(), signature, secret);` }]);
  assert.equal(findings.length, 0);
});

test("flags dynamic code execution but ignores test fixtures", () => {
  const sourceFindings = scanRepositoryFiles([{ path: "src/runner.ts", content: `const run = new Function("input", source);` }]);
  const fixtureFindings = scanRepositoryFiles([{ path: "tests/runner.test.ts", content: `eval("fixture")` }]);
  assert.equal(sourceFindings.some((finding) => finding.rule_id === "dynamic-code-execution"), true);
  assert.equal(fixtureFindings.length, 0);
});

test("does not trigger dangerous-pattern rules on the scanner definition itself", () => {
  const findings = scanRepositoryFiles([{ path: "lib/code-scanner.ts", content: `type CodeFinding = {}; const rule_id = "dynamic"; const pattern = /eval\\s*\\(/; const evidence = "eval() and httpOnly: false";` }]);
  assert.equal(findings.length, 0);
});

test("flags an AI route missing multiple abuse controls", () => {
  const findings = scanRepositoryFiles([{ path: "app/api/chat/route.ts", content: `return streamText({ model, prompt });` }]);
  assert.equal(findings.some((finding) => finding.rule_id === "ai-route-abuse-controls"), true);
});

test("allows an AI route with authentication, rate limiting, and an output cap", () => {
  const findings = scanRepositoryFiles([{ path: "app/api/chat/route.ts", content: `const user = await getUser(); await rateLimit(user.id); return streamText({ model, prompt, maxOutputTokens: 500 });` }]);
  assert.equal(findings.length, 0);
});

test("flags disabled RLS and broad anonymous grants", () => {
  const findings = scanRepositoryFiles([{ path: "supabase/migrations/002.sql", content: `alter table public.profiles disable row level security;\ngrant all privileges on table public.profiles to anon;` }]);
  assert.equal(findings.some((finding) => finding.rule_id === "supabase-rls-disabled"), true);
  assert.equal(findings.some((finding) => finding.rule_id === "supabase-anon-grant-all"), true);
});
