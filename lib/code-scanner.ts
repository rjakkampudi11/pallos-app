import { createHash } from "node:crypto";

export type ScanFile = { path: string; content: string };
export type CodeFinding = {
  fingerprint: string;
  rule_id: string;
  title: string;
  severity: "critical" | "high" | "review" | "low";
  category: string;
  file_path: string;
  line_number: number | null;
  evidence: string;
  explanation: string;
  suggested_fix: string;
  source_hash: string;
};

const secretRules = [
  { id: "secret-openai", name: "OpenAI-style API key", pattern: /(?:sk-(?:proj-)?[A-Za-z0-9_-]{20,})/g },
  { id: "secret-github", name: "GitHub access token", pattern: /(?:gh[pousr]_[A-Za-z0-9]{20,})/g },
  { id: "secret-stripe", name: "Stripe secret key", pattern: /(?:sk_(?:live|test)_[A-Za-z0-9]{16,})/g },
  { id: "secret-aws", name: "AWS access key", pattern: /(?:AKIA[A-Z0-9]{16})/g },
  { id: "secret-google", name: "Google API key", pattern: /(?:AIza[A-Za-z0-9_-]{35})/g },
  { id: "secret-slack", name: "Slack token", pattern: /(?:xox[baprs]-[A-Za-z0-9-]{20,})/g },
  { id: "secret-private-key", name: "Private key", pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
];

function fingerprint(rule: string, path: string, line: number | null) {
  return createHash("sha256").update(`${rule}:${path}:${line || 0}`).digest("hex");
}

function lineFor(content: string, index: number) {
  return content.slice(0, index).split("\n").length;
}

function addFinding(list: CodeFinding[], input: Omit<CodeFinding, "fingerprint">) {
  const findingFingerprint = fingerprint(input.rule_id, input.file_path, input.line_number);
  if (list.some((finding) => finding.fingerprint === findingFingerprint)) return;
  list.push({ ...input, fingerprint: findingFingerprint });
}

function sourceHash(file: ScanFile) {
  return createHash("sha256").update(file.content).digest("hex");
}

function firstMatch(content: string, pattern: RegExp) {
  pattern.lastIndex = 0;
  return pattern.exec(content);
}

function isTestFile(path: string) {
  return /(?:^|\/)(?:tests?|__tests__|fixtures?|examples?)(?:\/|$)|\.(?:test|spec)\.[cm]?[jt]sx?$/i.test(path);
}

function isDetectionRuleFile(file: ScanFile) {
  return /(?:scanner|detector|rules?)[^/]*\.[cm]?[jt]sx?$/i.test(file.path)
    && /rule_id|scanRepositoryFiles|CodeFinding/.test(file.content);
}

export function scanRepositoryFiles(files: ScanFile[]) {
  const findings: CodeFinding[] = [];
  for (const file of files) {
    for (const rule of secretRules) {
      rule.pattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = rule.pattern.exec(file.content)) !== null) {
        const line = lineFor(file.content, match.index);
        addFinding(findings, {
          rule_id: rule.id,
          title: `${rule.name} appears in source code`,
          severity: "critical",
          category: "Secrets",
          file_path: file.path,
          line_number: line,
          evidence: `A value matching ${rule.name.toLowerCase()} was detected on line ${line}. The value was redacted and was not saved.`,
          explanation: "A committed credential can be copied from repository history and used outside your application.",
          suggested_fix: "Revoke and rotate the credential, move the replacement into server-only environment storage, and remove it from repository history.",
          source_hash: sourceHash(file),
        });
      }
    }

    const clientFile = /(^|\/)(components?|app|pages|src)\//i.test(file.path) && /(?:^|\n)\s*["']use client["'];?/i.test(file.content);
    const serviceRole = /(?:process\.env\.|import\.meta\.env\.|Deno\.env\.get\s*\(\s*["'])SUPABASE_(?:SERVICE_ROLE|SECRET)_KEY/i.exec(file.content);
    if (clientFile && serviceRole) {
      const line = lineFor(file.content, serviceRole.index);
      addFinding(findings, {
        rule_id: "supabase-service-role-client",
        title: "Supabase privileged key referenced in client code",
        severity: "critical",
        category: "Boundaries",
        file_path: file.path,
        line_number: line,
        evidence: `A client module references a Supabase service-role or secret key name on line ${line}. No credential value was saved.`,
        explanation: "Client code is delivered to browsers. A privileged database key there can bypass Row Level Security.",
        suggested_fix: "Move privileged Supabase operations into server-only code and expose only the minimum authenticated operation to the client.",
        source_hash: sourceHash(file),
      });
    }

    const publicSensitiveEnv = firstMatch(file.content, /NEXT_PUBLIC_[A-Z0-9_]*(?:SECRET|PRIVATE|SERVICE_ROLE|PASSWORD|TOKEN)[A-Z0-9_]*/g);
    if (publicSensitiveEnv && !isTestFile(file.path) && !isDetectionRuleFile(file)) {
      const line = lineFor(file.content, publicSensitiveEnv.index);
      addFinding(findings, {
        rule_id: "public-sensitive-environment-variable",
        title: "Sensitive environment variable is marked public",
        severity: "critical",
        category: "Boundaries",
        file_path: file.path,
        line_number: line,
        evidence: `A NEXT_PUBLIC_ variable with a sensitive name appears on line ${line}. Its value was not saved.`,
        explanation: "Next.js includes NEXT_PUBLIC_ values in browser JavaScript, where every visitor can read them.",
        suggested_fix: "Rename the variable without NEXT_PUBLIC_, use it only in server code, and rotate it if it has already been deployed.",
        source_hash: sourceHash(file),
      });
    }

    const insecureCookie = firstMatch(file.content, /(?:cookies?\s*\(\s*\)\s*\.set|setCookie|cookie)[\s\S]{0,500}?["'`](?:session|auth|token|jwt|sid)[^"'`]*["'`][\s\S]{0,500}?httpOnly\s*:\s*false/gi);
    if (insecureCookie && !isTestFile(file.path) && !isDetectionRuleFile(file)) {
      const line = lineFor(file.content, insecureCookie.index);
      addFinding(findings, {
        rule_id: "auth-cookie-not-http-only",
        title: "Authentication cookie is readable by browser scripts",
        severity: "high",
        category: "Sessions",
        file_path: file.path,
        line_number: line,
        evidence: `An authentication-like cookie is configured with httpOnly: false near line ${line}.`,
        explanation: "Browser JavaScript can read this cookie, increasing the impact of a cross-site scripting bug.",
        suggested_fix: "Set httpOnly: true on authentication cookies and keep non-sensitive display preferences in separate cookies.",
        source_hash: sourceHash(file),
      });
    }

    const apiLikeFile = /(?:^|\/)(?:app\/api|api|server|functions)(?:\/|$)/i.test(file.path);
    const wildcardCors = /access-control-allow-origin["'`\]]?\s*[:,]\s*["'`]\*["'`]/i.test(file.content);
    const credentialedCors = /access-control-allow-credentials["'`\]]?\s*[:,]\s*(?:["'`]true["'`]|true)/i.test(file.content);
    if (apiLikeFile && wildcardCors && credentialedCors) {
      const match = firstMatch(file.content, /access-control-allow-origin/i);
      const line = match ? lineFor(file.content, match.index) : 1;
      addFinding(findings, {
        rule_id: "credentialed-wildcard-cors",
        title: "Credentialed API uses a wildcard CORS origin",
        severity: "high",
        category: "Access",
        file_path: file.path,
        line_number: line,
        evidence: `Wildcard origin and credentialed CORS settings appear together near line ${line}.`,
        explanation: "Credentialed cross-origin requests should be limited to explicitly trusted origins.",
        suggested_fix: "Validate the request Origin against an allowlist and return that exact trusted origin instead of *.",
        source_hash: sourceHash(file),
      });
    }

    const stripeWebhook = /(?:^|\/)api\/.*(?:stripe.*webhook|webhook.*stripe).*\/route\.[cm]?[jt]sx?$/i.test(file.path);
    const verifiesStripeSignature = /stripe-signature|webhooks\s*\.\s*constructEvent|constructEventAsync/i.test(file.content);
    if (stripeWebhook && !verifiesStripeSignature) {
      addFinding(findings, {
        rule_id: "stripe-webhook-signature",
        title: "Stripe webhook does not show signature verification",
        severity: "high",
        category: "Webhooks",
        file_path: file.path,
        line_number: 1,
        evidence: "This Stripe webhook route does not reference Stripe signature verification.",
        explanation: "Without signature verification, an attacker can send forged events to the webhook endpoint.",
        suggested_fix: "Read the raw request body and verify the stripe-signature header with Stripe webhooks.constructEvent before processing the event.",
        source_hash: sourceHash(file),
      });
    }

    const dynamicExecution = firstMatch(file.content, /\beval\s*\(|\bnew\s+Function\s*\(/g);
    if (dynamicExecution && !isTestFile(file.path) && !isDetectionRuleFile(file)) {
      const line = lineFor(file.content, dynamicExecution.index);
      addFinding(findings, {
        rule_id: "dynamic-code-execution",
        title: "Dynamic code execution needs review",
        severity: "review",
        category: "Injection",
        file_path: file.path,
        line_number: line,
        evidence: `eval() or new Function() appears on line ${line}.`,
        explanation: "Executing strings as code can become remote code execution when any part of the string is influenced by a user or external service.",
        suggested_fix: "Replace dynamic execution with an explicit parser or allowlisted operation map. If unavoidable, prove that no untrusted input can reach it.",
        source_hash: sourceHash(file),
      });
    }

    const aiRoute = /(?:^|\/)app\/api\/.*\/route\.[cm]?[jt]sx?$/i.test(file.path)
      && /generateText|streamText|generateObject|chat\.completions|responses\.create|anthropic\.messages/i.test(file.content);
    if (aiRoute) {
      const missing: string[] = [];
      if (!/getUser|getSession|auth\s*\(|currentUser|requireAuth|authorization/i.test(file.content)) missing.push("authentication");
      if (!/rateLimit|ratelimit|upstash|limiter|429|too many requests/i.test(file.content)) missing.push("rate limiting");
      if (!/maxOutputTokens|maxTokens|max_tokens|tokenLimit/i.test(file.content)) missing.push("an output token limit");
      if (missing.length >= 2) {
        addFinding(findings, {
          rule_id: "ai-route-abuse-controls",
          title: "AI route is missing multiple abuse controls",
          severity: "review",
          category: "AI Usage",
          file_path: file.path,
          line_number: 1,
          evidence: `Static review did not find ${missing.join(", ")} in this AI route.`,
          explanation: "An unguarded AI endpoint can be used by strangers to consume quota and create unexpectedly large bills.",
          suggested_fix: "Authenticate callers where appropriate, enforce per-user or per-IP rate limits, and cap output tokens at the server.",
          source_hash: sourceHash(file),
        });
      }
    }

    if (/app\/api\/.*admin.*\/route\.[cm]?[jt]sx?$/i.test(file.path)) {
      const hasAuth = /getUser|getSession|auth\s*\(|currentUser|requireAuth|authorize/i.test(file.content);
      const hasRole = /isAdmin|role|permission|authorize|forbidden|403/i.test(file.content);
      if (!hasAuth || !hasRole) addFinding(findings, {
        rule_id: "admin-route-authorization",
        title: "Admin route needs explicit authorization review",
        severity: "high",
        category: "Access",
        file_path: file.path,
        line_number: 1,
        evidence: `This admin route does not show both an identity check and an explicit role or permission check.`,
        explanation: "Being signed in does not automatically make a user an administrator.",
        suggested_fix: "Verify the user on the server, enforce an explicit admin permission, and deny access by default.",
        source_hash: sourceHash(file),
      });
    }

    if (/supabase\/migrations\/.*\.sql$/i.test(file.path)) {
      const permissive = /create\s+policy[\s\S]{0,400}(?:using|with\s+check)\s*\(\s*true\s*\)/gi.exec(file.content);
      if (permissive) {
        const line = lineFor(file.content, permissive.index);
        addFinding(findings, {
          rule_id: "supabase-permissive-policy",
          title: "Supabase policy allows every row",
          severity: "high",
          category: "Database",
          file_path: file.path,
          line_number: line,
          evidence: `A policy uses an unconditional true expression near line ${line}.`,
          explanation: "An unconditional policy can expose or modify rows across users unless another control narrows access.",
          suggested_fix: "Scope the policy to auth.uid(), a workspace membership, or another verified ownership condition and test with two accounts.",
          source_hash: sourceHash(file),
        });
      }

      const disabledRls = firstMatch(file.content, /alter\s+table[\s\S]{0,200}?disable\s+row\s+level\s+security/gi);
      if (disabledRls) {
        const line = lineFor(file.content, disabledRls.index);
        addFinding(findings, {
          rule_id: "supabase-rls-disabled",
          title: "Migration disables Row Level Security",
          severity: "high",
          category: "Database",
          file_path: file.path,
          line_number: line,
          evidence: `A migration disables Row Level Security near line ${line}.`,
          explanation: "Tables exposed through Supabase's Data API can become accessible without the row protections the application expects.",
          suggested_fix: "Keep RLS enabled, add narrowly scoped policies, and perform privileged work through server-only code.",
          source_hash: sourceHash(file),
        });
      }

      const anonGrant = firstMatch(file.content, /grant\s+all(?:\s+privileges)?[\s\S]{0,250}?\s+to\s+(?:anon|public)\b/gi);
      if (anonGrant) {
        const line = lineFor(file.content, anonGrant.index);
        addFinding(findings, {
          rule_id: "supabase-anon-grant-all",
          title: "Anonymous role receives all privileges",
          severity: "critical",
          category: "Database",
          file_path: file.path,
          line_number: line,
          evidence: `A GRANT ALL statement targets anon or public near line ${line}.`,
          explanation: "Broad anonymous privileges can allow untrusted visitors to read, change, or remove application data.",
          suggested_fix: "Revoke broad privileges and grant only the exact operations required, protected by tested RLS policies.",
          source_hash: sourceHash(file),
        });
      }
    }
  }
  return findings;
}
