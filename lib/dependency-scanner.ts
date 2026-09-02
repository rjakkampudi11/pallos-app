import { createHash } from "node:crypto";
import type { CodeFinding, ScanFile } from "@/lib/code-scanner";

type PackageLock = { packages?: Record<string, { version?: string }> };
type OsvResult = { results?: Array<{ vulns?: Array<{ id: string; summary?: string; database_specific?: { severity?: string } }> }> };

function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function severity(value?: string): CodeFinding["severity"] {
  const normalized = value?.toLowerCase();
  if (normalized === "critical") return "critical";
  if (normalized === "high") return "high";
  if (normalized === "low") return "low";
  return "review";
}

export async function scanDependencies(files: ScanFile[]): Promise<{ findings: CodeFinding[]; checked: boolean }> {
  const lock = files.find((file) => /(?:^|\/)package-lock\.json$/i.test(file.path));
  if (!lock) return { findings: [], checked: false };

  let parsed: PackageLock;
  try { parsed = JSON.parse(lock.content) as PackageLock; }
  catch { return { findings: [], checked: false }; }

  const dependencies = Object.entries(parsed.packages || {}).flatMap(([path, item]) => {
    const marker = "node_modules/";
    const index = path.lastIndexOf(marker);
    const name = index >= 0 ? path.slice(index + marker.length) : "";
    return name && item.version ? [{ name, version: item.version }] : [];
  }).slice(0, 1_000);
  if (!dependencies.length) return { findings: [], checked: true };

  let data: OsvResult;
  try {
    const response = await fetch("https://api.osv.dev/v1/querybatch", {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "Pallos-Agent/1.0" },
      body: JSON.stringify({ queries: dependencies.map((dependency) => ({ package: { ecosystem: "npm", name: dependency.name }, version: dependency.version })) }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) return { findings: [], checked: false };
    data = await response.json() as OsvResult;
  } catch { return { findings: [], checked: false }; }

  const findings: CodeFinding[] = [];
  for (const [index, result] of (data.results || []).entries()) {
    const dependency = dependencies[index];
    for (const advisory of result.vulns || []) {
      const identity = `${dependency.name}@${dependency.version}:${advisory.id}`;
      findings.push({
        fingerprint: digest(`dependency:${identity}`),
        rule_id: `dependency-advisory:${advisory.id}`,
        title: `${dependency.name} ${dependency.version} has a published advisory`,
        severity: severity(advisory.database_specific?.severity),
        category: "Dependencies",
        file_path: lock.path,
        line_number: null,
        evidence: `${advisory.id} applies to the locked ${dependency.name} ${dependency.version} package version.`,
        explanation: advisory.summary || "A public vulnerability database reports that this locked dependency version is affected.",
        suggested_fix: "Review the advisory, upgrade to a patched version, run the application test suite, and confirm whether the vulnerable code path is reachable.",
        source_hash: digest(lock.content),
      });
    }
  }
  return { findings, checked: true };
}
