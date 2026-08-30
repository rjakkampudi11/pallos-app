import assert from "node:assert/strict";
import test from "node:test";
import { assessCodeScan, assessEndpoint } from "../lib/security-assessment.ts";
import { scanRepositoryFiles } from "../lib/code-scanner.ts";

test("a healthy API still returns useful passed and untested checks without a misleading 100", () => {
  const assessment = assessEndpoint({
    ok: true, statusCode: 200, body: { ok: true }, durationMs: 20, errorMessage: null,
    security: { https: true, headers: { "strict-transport-security": "max-age=31536000", "x-content-type-options": "nosniff" }, cookies: [] },
  }, []);
  assert.ok(assessment.checks.some((item) => item.status === "passed"));
  assert.ok(assessment.checks.some((item) => item.status === "not_tested"));
  assert.ok(assessment.score < 100);
  assert.match(assessment.summary, /No verified vulnerabilities/);
});

test("verified high-risk endpoint signals lower the score and include remediation", () => {
  const assessment = assessEndpoint({
    ok: true, statusCode: 200, body: { ok: true }, durationMs: 20, errorMessage: null,
    security: { https: true, headers: { "access-control-allow-origin": "*", "access-control-allow-credentials": "true" }, cookies: [{ secure: false, httpOnly: false, sameSite: false }] },
  }, []);
  const failures = assessment.checks.filter((item) => item.status === "failed");
  assert.ok(failures.some((item) => item.id === "cors" && item.severity === "high"));
  assert.ok(failures.every((item) => item.remediation));
  assert.notEqual(assessment.grade, "Strong");
});

test("code assessments reuse deterministic findings and keep unavailable checks untested", () => {
  const files = [{ path: "app/api/admin/users/route.ts", content: "export async function GET() { return Response.json([]) }" }];
  const findings = scanRepositoryFiles(files);
  const assessment = assessCodeScan(files, findings);
  assert.ok(assessment.checks.some((item) => item.id === "admin-authorization" && item.status === "failed" && item.severity === "high"));
  assert.ok(assessment.checks.some((item) => item.id === "dependency-advisories" && item.status === "not_tested"));
  assert.equal(assessment.grade, "High Risk");
});
