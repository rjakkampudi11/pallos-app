import assert from "node:assert/strict";
import test from "node:test";
import { isPallosDemoUrl, summarizeFreeScan } from "../lib/free-scan.ts";

test("only the official safe endpoint bypasses the one-scan quota", () => {
  assert.equal(isPallosDemoUrl(new URL("https://pallosagent.info/api/training/profile")), true);
  assert.equal(isPallosDemoUrl(new URL("https://pallosagent.com/api/training/profile")), true);
  assert.equal(isPallosDemoUrl(new URL("https://pallosagent.info/api/training/profile?fault=1")), false);
  assert.equal(isPallosDemoUrl(new URL("https://example.com/api/training/profile")), false);
});

test("the free scan exposes schema without response values", () => {
  const result = summarizeFreeScan(new URL("https://example.com/api/profile"), {
    ok: true,
    statusCode: 200,
    durationMs: 42,
    errorMessage: null,
    body: { email: "private@example.com", profile: { active: true } },
  });
  assert.equal(result.outcome, "healthy");
  assert.equal(result.fieldCount, 3);
  assert.deepEqual(result.fields, [
    { path: "$.email", type: "string" },
    { path: "$.profile", type: "object" },
    { path: "$.profile.active", type: "boolean" },
  ]);
  assert.equal(JSON.stringify(result).includes("private@example.com"), false);
});

test("an HTTP failure is reported without pretending the endpoint is healthy", () => {
  const result = summarizeFreeScan(new URL("https://example.com/api/profile"), {
    ok: false,
    statusCode: 503,
    durationMs: 18,
    errorMessage: "HTTP 503",
    body: { error: "down" },
  });
  assert.equal(result.outcome, "warning");
  assert.equal(result.checks.httpSuccess, false);
  assert.equal(result.message, "HTTP 503");
});
