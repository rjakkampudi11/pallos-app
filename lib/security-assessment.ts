import type { CodeFinding, ScanFile } from "@/lib/code-scanner";
import type { EndpointSnapshot, MonitorChange } from "@/lib/monitoring";

export type AssessmentSeverity = "low" | "medium" | "high" | "critical";
export type AssessmentStatus = "passed" | "failed" | "not_tested";

export type AssessmentCheck = {
  id: string;
  title: string;
  status: AssessmentStatus;
  severity: AssessmentSeverity | null;
  explanation: string;
  remediation: string | null;
  evidence: string | null;
};

export type SecurityAssessment = {
  version: 1;
  score: number;
  grade: "Strong" | "Moderate Risk" | "High Risk" | "Critical Risk";
  summary: string;
  coverage: number;
  checks: AssessmentCheck[];
};

const severityWeight: Record<AssessmentSeverity, number> = { low: 4, medium: 10, high: 22, critical: 40 };

function finalize(checks: AssessmentCheck[]): SecurityAssessment {
  const tested = checks.filter((check) => check.status !== "not_tested");
  const failed = checks.filter((check) => check.status === "failed");
  const totalWeight = checks.reduce((sum, check) => sum + severityWeight[check.severity || "low"], 0) || 1;
  const testedWeight = tested.reduce((sum, check) => sum + severityWeight[check.severity || "low"], 0);
  const failedWeight = failed.reduce((sum, check) => sum + severityWeight[check.severity || "low"], 0);
  const coverage = Math.round((testedWeight / totalWeight) * 100);
  let score = Math.round(100 - (failedWeight / totalWeight) * 100);
  if (checks.some((check) => check.status === "not_tested")) score = Math.min(score, 95);
  if (coverage < 50) score = Math.min(score, 84);
  score = Math.max(0, score);
  const hasCritical = failed.some((check) => check.severity === "critical");
  const hasHigh = failed.some((check) => check.severity === "high");
  const grade = hasCritical || score < 40 ? "Critical Risk" : hasHigh || score < 70 ? "High Risk" : score < 85 ? "Moderate Risk" : "Strong";
  const summary = hasCritical
    ? "Critical risk signals need attention before launch."
    : failed.length === 0
      ? "No verified vulnerabilities were found in the checks Pallos could complete. Untested areas remain clearly identified."
      : `No critical vulnerabilities were verified. Pallos found ${failed.length} lower-severity ${failed.length === 1 ? "risk signal" : "risk signals"} to review.`;
  return { version: 1, score, grade, summary, coverage, checks };
}

function check(input: AssessmentCheck): AssessmentCheck { return input; }

export function assessEndpoint(snapshot: EndpointSnapshot, changes: MonitorChange[]): SecurityAssessment {
  const headers = snapshot.security?.headers || {};
  const cookies = snapshot.security?.cookies || [];
  const contractFailures = changes.filter((change) => change.serious);
  const checks: AssessmentCheck[] = [
    check({ id: "https", title: "HTTPS transport", status: snapshot.security?.https ? "passed" : "failed", severity: "critical", explanation: "HTTPS protects API traffic from interception and modification in transit.", remediation: snapshot.security?.https ? null : "Serve this endpoint only over HTTPS with a valid certificate.", evidence: snapshot.security?.https ? "The scanned URL used HTTPS." : "The endpoint was not verified over HTTPS." }),
    check({ id: "availability", title: "Public endpoint availability", status: snapshot.ok ? "passed" : "failed", severity: "high", explanation: "Unavailable or invalid endpoints can break dependent application flows.", remediation: snapshot.ok ? null : "Restore a successful response and return valid JSON before relying on this endpoint.", evidence: snapshot.statusCode ? `Observed HTTP ${snapshot.statusCode}.` : snapshot.errorMessage }),
    check({ id: "contract", title: "Response contract stability", status: contractFailures.length ? "failed" : snapshot.ok ? "passed" : "not_tested", severity: "high", explanation: "Missing fields and type changes can break clients even when the endpoint still returns HTTP 200.", remediation: contractFailures.length ? "Restore the documented field names and types, or version the API and update every client deliberately." : null, evidence: contractFailures.length ? `${contractFailures.length} serious schema ${contractFailures.length === 1 ? "change was" : "changes were"} observed.` : snapshot.ok ? "No missing fields or type changes were observed." : "The response could not be compared." }),
    check({ id: "hsts", title: "Strict Transport Security", status: headers["strict-transport-security"] ? "passed" : snapshot.statusCode ? "failed" : "not_tested", severity: "medium", explanation: "HSTS tells browsers to keep using HTTPS and reduces downgrade risk.", remediation: headers["strict-transport-security"] ? null : "Add a Strict-Transport-Security header after confirming all subdomains support HTTPS.", evidence: headers["strict-transport-security"] ? "Strict-Transport-Security was present." : snapshot.statusCode ? "No Strict-Transport-Security header was observed." : null }),
    check({ id: "nosniff", title: "MIME sniffing protection", status: headers["x-content-type-options"]?.toLowerCase() === "nosniff" ? "passed" : snapshot.statusCode ? "failed" : "not_tested", severity: "low", explanation: "nosniff reduces the chance that a browser interprets a response as a more dangerous content type.", remediation: headers["x-content-type-options"] ? "Set X-Content-Type-Options to nosniff." : "Add X-Content-Type-Options: nosniff to API responses.", evidence: headers["x-content-type-options"] ? `Observed X-Content-Type-Options: ${headers["x-content-type-options"]}.` : snapshot.statusCode ? "The header was not observed." : null }),
    check({ id: "cors", title: "Credentialed CORS exposure", status: headers["access-control-allow-origin"] === "*" && headers["access-control-allow-credentials"]?.toLowerCase() === "true" ? "failed" : headers["access-control-allow-origin"] ? "passed" : "not_tested", severity: "high", explanation: "Credentialed cross-origin access must be limited to explicitly trusted origins.", remediation: "Replace the wildcard with an allowlist and return only the validated requesting origin.", evidence: headers["access-control-allow-origin"] ? `Observed Access-Control-Allow-Origin: ${headers["access-control-allow-origin"]}.` : "No CORS policy was observable on this response." }),
    check({ id: "cookies", title: "Observable cookie attributes", status: cookies.length === 0 ? "not_tested" : cookies.every((cookie) => cookie.secure && cookie.httpOnly && cookie.sameSite) ? "passed" : "failed", severity: "high", explanation: "Secure, HttpOnly, and SameSite attributes reduce session theft and cross-site request risk.", remediation: cookies.length ? "Add Secure, HttpOnly, and an appropriate SameSite value to every sensitive cookie." : null, evidence: cookies.length ? `${cookies.length} Set-Cookie ${cookies.length === 1 ? "header was" : "headers were"} observable; cookie values were not stored.` : "No Set-Cookie header was observable." }),
    check({ id: "technology-disclosure", title: "Technology disclosure", status: headers["x-powered-by"] ? "failed" : snapshot.statusCode ? "passed" : "not_tested", severity: "low", explanation: "Unnecessary framework disclosure gives attackers extra targeting information.", remediation: headers["x-powered-by"] ? "Disable the X-Powered-By response header." : null, evidence: headers["x-powered-by"] ? "An X-Powered-By header was observed; its value is intentionally not included here." : snapshot.statusCode ? "No X-Powered-By header was observed." : null }),
    check({ id: "browser-page-controls", title: "Browser page controls", status: "not_tested", severity: "medium", explanation: "CSP, frame restrictions, and referrer policy belong to rendered pages and cannot be judged reliably from a JSON API response.", remediation: null, evidence: "Not tested on this API-only scan." }),
  ];
  return finalize(checks);
}

const findingSeverity = (severity: CodeFinding["severity"]): AssessmentSeverity => severity === "review" ? "medium" : severity;

export function assessCodeScan(files: ScanFile[], findings: CodeFinding[], treeTruncated = false): SecurityAssessment {
  const has = (pattern: RegExp) => files.some((file) => pattern.test(file.path) || pattern.test(file.content));
  const groups = new Map<string, CodeFinding[]>();
  for (const finding of findings) groups.set(finding.rule_id, [...(groups.get(finding.rule_id) || []), finding]);
  const definitions = [
    { id: "committed-secrets", title: "Committed credential patterns", rules: [...new Set(findings.filter((finding) => finding.rule_id.startsWith("secret-")).map((finding) => finding.rule_id))], always: true, severity: "critical" as const, explanation: "Committed credentials can be copied from source history and used outside the application.", remediation: "Revoke exposed credentials, move replacements to server-only environment storage, and clean repository history." },
    { id: "client-secret-boundary", title: "Client/server secret boundary", rules: ["supabase-service-role-client", "public-sensitive-environment-variable"], always: true, severity: "critical" as const, explanation: "Privileged values in browser code can bypass intended server and database controls.", remediation: "Move privileged operations and secrets into server-only code and rotate anything already deployed." },
    { id: "session-cookie-config", title: "Authentication cookie configuration", rules: ["auth-cookie-not-http-only"], applicable: has(/cookie|session|auth/i), severity: "high" as const, explanation: "Script-readable authentication cookies increase the impact of cross-site scripting.", remediation: "Use HttpOnly, Secure, and an appropriate SameSite value for sensitive cookies." },
    { id: "cors-config", title: "Credentialed CORS configuration", rules: ["credentialed-wildcard-cors"], applicable: has(/(?:app\/api|api|server|functions)/i), severity: "high" as const, explanation: "Credentialed cross-origin APIs should accept only explicitly trusted origins.", remediation: "Validate Origin against an allowlist instead of combining credentials with a wildcard." },
    { id: "webhook-signatures", title: "Stripe webhook signatures", rules: ["stripe-webhook-signature"], applicable: has(/stripe.*webhook|webhook.*stripe/i), severity: "high" as const, explanation: "Unsigned webhooks can allow forged events to trigger application actions.", remediation: "Verify the provider signature against the raw request body before processing events." },
    { id: "dynamic-execution", title: "Dynamic code execution", rules: ["dynamic-code-execution"], always: true, severity: "medium" as const, explanation: "Executing strings as code can become code execution when input is not fully controlled.", remediation: "Replace eval-like behavior with an explicit parser or allowlisted operation map." },
    { id: "ai-abuse-controls", title: "AI endpoint abuse controls", rules: ["ai-route-abuse-controls"], applicable: has(/generateText|streamText|responses\.create|chat\.completions|anthropic\.messages/i), severity: "medium" as const, explanation: "Unprotected AI endpoints can be abused to consume quota and create unexpected cost.", remediation: "Require appropriate authentication, rate-limit callers, and cap model output on the server." },
    { id: "admin-authorization", title: "Admin route authorization", rules: ["admin-route-authorization"], applicable: has(/app\/api\/.*admin.*\/route/i), severity: "critical" as const, explanation: "Admin routes need explicit identity and permission enforcement.", remediation: "Authenticate the caller and enforce an admin role or permission before any privileged action." },
    { id: "supabase-rls", title: "Supabase Row Level Security", rules: ["supabase-permissive-policy", "supabase-rls-disabled", "supabase-anon-grant-all"], applicable: has(/supabase|create policy|row level security/i), severity: "critical" as const, explanation: "Overly broad database policies can expose or modify customer data.", remediation: "Enable RLS, remove broad anonymous grants, and scope policies to the authenticated user." },
  ];
  const checks: AssessmentCheck[] = definitions.map((definition) => {
    const matched = definition.rules.flatMap((rule) => groups.get(rule) || []);
    const tested = definition.always || definition.applicable;
    return check({ id: definition.id, title: definition.title, status: matched.length ? "failed" : tested ? "passed" : "not_tested", severity: matched.length ? findingSeverity(matched[0].severity) : definition.severity, explanation: definition.explanation, remediation: matched.length ? definition.remediation : null, evidence: matched.length ? `${matched.length} verified ${matched.length === 1 ? "finding" : "findings"}; first observed at ${matched[0].file_path}${matched[0].line_number ? `:${matched[0].line_number}` : ""}.` : tested ? `Checked ${files.length} eligible repository files with no matching finding.` : "The required technology or surface was not reliably detected." });
  });
  checks.push(check({ id: "dependency-advisories", title: "Installed dependency advisories", status: "not_tested", severity: "high", explanation: "Source-only scanning does not prove which dependency versions are deployed or whether an advisory is exploitable.", remediation: null, evidence: "Not tested; Pallos did not run package installation or third-party code." }));
  if (treeTruncated) checks.push(check({ id: "repository-coverage", title: "Repository scan coverage", status: "not_tested", severity: "medium", explanation: "GitHub returned a truncated tree, so some eligible files may not have been available to Pallos.", remediation: null, evidence: "GitHub marked the repository tree response as truncated." }));
  return finalize(checks);
}
