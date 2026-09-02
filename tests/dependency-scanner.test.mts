import assert from "node:assert/strict";
import test from "node:test";
import { scanDependencies } from "../lib/dependency-scanner.ts";

test("maps OSV advisories to redaction-safe dependency findings", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ results: [{ vulns: [{ id: "GHSA-test-1234", summary: "Test advisory", database_specific: { severity: "HIGH" } }] }] }), { status: 200, headers: { "Content-Type": "application/json" } });
  try {
    const result = await scanDependencies([{ path: "package-lock.json", content: JSON.stringify({ packages: { "node_modules/example": { version: "1.0.0" } } }) }]);
    const findings = result.findings;
    assert.equal(result.checked, true);
    assert.equal(findings.length, 1);
    assert.equal(findings[0].rule_id, "dependency-advisory:GHSA-test-1234");
    assert.equal(findings[0].severity, "high");
    assert.match(findings[0].evidence, /example 1\.0\.0/);
  } finally { globalThis.fetch = originalFetch; }
});

test("skips dependency scanning when no supported lockfile is present", async () => {
  assert.deepEqual(await scanDependencies([{ path: "package.json", content: "{}" }]), { findings: [], checked: false });
});
