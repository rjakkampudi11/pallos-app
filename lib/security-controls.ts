import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type RateLimitOptions = {
  scope: string;
  identifier: string;
  limit: number;
  windowSeconds: number;
};

type AuditInput = {
  userId: string;
  action: string;
  resourceType?: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
  request?: Request;
};

const fallbackLimits = new Map<string, { count: number; resetAt: number }>();

export function requestAddress(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
}

export function securityHash(value: string) {
  const salt = process.env.RATE_LIMIT_SALT || process.env.CRON_SECRET || process.env.SUPABASE_SECRET_KEY || "pallos-v1";
  return createHash("sha256").update(`${salt}:${value}`).digest("hex");
}

export async function enforceRateLimit(request: Request, options: RateLimitOptions) {
  const supabase = getSupabaseAdmin();
  const key = securityHash(`${options.scope}:${options.identifier}`);
  if (supabase) {
    const { data, error } = await supabase.rpc("pallos_consume_rate_limit", {
      p_rate_key: key,
      p_window_seconds: options.windowSeconds,
      p_request_limit: options.limit,
    });
    if (!error && data && typeof data === "object") {
      const result = data as { allowed?: boolean; retry_after?: number };
      if (!result.allowed) return rateLimited(result.retry_after || options.windowSeconds);
      return null;
    }
    if (error && !["42883", "PGRST202"].includes(error.code || "")) console.error("Rate limit storage failed", error.message);
  }

  const now = Date.now();
  const current = fallbackLimits.get(key);
  if (!current || current.resetAt <= now) {
    fallbackLimits.set(key, { count: 1, resetAt: now + options.windowSeconds * 1000 });
    return null;
  }
  current.count += 1;
  if (current.count > options.limit) return rateLimited(Math.ceil((current.resetAt - now) / 1000));
  return null;
}

function rateLimited(retryAfter: number) {
  const response = NextResponse.json({ error: "Too many attempts. Please wait and try again." }, { status: 429 });
  response.headers.set("Retry-After", String(Math.max(1, retryAfter)));
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function recordAuditEvent(input: AuditInput) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;
  const { error } = await supabase.from("pallos_audit_events").insert({
    user_id: input.userId,
    action: input.action,
    resource_type: input.resourceType || "account",
    resource_id: input.resourceId || null,
    metadata: input.metadata || {},
    ip_hash: input.request ? securityHash(requestAddress(input.request)) : null,
    user_agent: input.request?.headers.get("user-agent")?.slice(0, 300) || null,
  });
  if (error && !["42P01", "PGRST205"].includes(error.code || "")) console.error("Audit event storage failed", error.message);
}
