import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
export type SchemaDescription = Record<string, string>;

export type EndpointSnapshot = {
  ok: boolean;
  statusCode: number | null;
  body: JsonValue | null;
  durationMs: number;
  errorMessage: string | null;
  security?: {
    https: boolean;
    headers: Record<string, string>;
    cookies: Array<{ secure: boolean; httpOnly: boolean; sameSite: boolean }>;
  };
};

export type MonitorChange = {
  kind: "http_error" | "invalid_json" | "missing_field" | "new_field" | "type_changed";
  path: string;
  expected: string | null;
  actual: string | null;
  serious: boolean;
};

const MAX_RESPONSE_BYTES = 1_000_000;
const REQUEST_TIMEOUT_MS = 10_000;

function valueType(value: JsonValue): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

export function describeSchema(value: JsonValue, path = "$", result: Record<string, string> = {}): Record<string, string> {
  result[path] = valueType(value);
  if (Array.isArray(value)) {
    if (value.length > 0) describeSchema(value[0], `${path}[]`, result);
  } else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) describeSchema(child, `${path}.${key}`, result);
  }
  return result;
}

export function compareResponse(expected: SchemaDescription, snapshot: EndpointSnapshot): MonitorChange[] {
  if (!snapshot.ok) {
    if (snapshot.statusCode !== null && snapshot.statusCode >= 200 && snapshot.statusCode < 300 && snapshot.body === null) {
      return [{ kind: "invalid_json", path: "$", expected: "JSON", actual: snapshot.errorMessage || "Invalid JSON", serious: true }];
    }
    return [{
      kind: "http_error",
      path: "$",
      expected: "Successful JSON response",
      actual: snapshot.statusCode === null ? snapshot.errorMessage || "Request failed" : `HTTP ${snapshot.statusCode}`,
      serious: true,
    }];
  }
  if (snapshot.body === null) return [{ kind: "invalid_json", path: "$", expected: "JSON", actual: "Empty or invalid JSON", serious: true }];

  const actual = describeSchema(snapshot.body);
  const changes: MonitorChange[] = [];

  for (const [path, type] of Object.entries(expected)) {
    if (!(path in actual)) changes.push({ kind: "missing_field", path, expected: type, actual: null, serious: true });
    else if (actual[path] !== type) changes.push({ kind: "type_changed", path, expected: type, actual: actual[path], serious: true });
  }
  for (const [path, type] of Object.entries(actual)) {
    if (!(path in expected)) changes.push({ kind: "new_field", path, expected: null, actual: type, serious: false });
  }
  return changes;
}

function isPrivateIp(address: string): boolean {
  if (address === "::1" || address.startsWith("fc") || address.startsWith("fd") || address.startsWith("fe80:")) return true;
  if (!isIP(address)) return true;
  if (address.includes(":")) return false;
  const [a, b] = address.split(".").map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

export async function validatePublicHttpsUrl(input: string): Promise<URL> {
  let url: URL;
  try { url = new URL(input); } catch { throw new Error("Enter a valid website API URL."); }
  if (url.protocol !== "https:") throw new Error("Only HTTPS API links are supported.");
  if (url.username || url.password) throw new Error("API links cannot include credentials.");
  if (["localhost", "0.0.0.0"].includes(url.hostname.toLowerCase())) throw new Error("Local and private network addresses are not supported.");
  const addresses = await lookup(url.hostname, { all: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateIp(address))) throw new Error("The API link must resolve to a public internet address.");
  return url;
}

export async function fetchEndpoint(input: string, privateHeaders: Record<string, string> = {}): Promise<EndpointSnapshot> {
  const started = Date.now();
  try {
    const url = await validatePublicHttpsUrl(input);
    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      redirect: "manual",
      headers: { ...privateHeaders, Accept: "application/json", "User-Agent": "Pallos-Monitor/1.0" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const observedHeaderNames = ["strict-transport-security", "x-content-type-options", "access-control-allow-origin", "access-control-allow-credentials", "x-powered-by"];
    const observedHeaders = Object.fromEntries(observedHeaderNames.flatMap((name) => {
      const value = response.headers.get(name);
      return value === null ? [] : [[name, value]];
    }));
    const getSetCookie = (response.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
    const setCookies = getSetCookie ? getSetCookie.call(response.headers) : response.headers.get("set-cookie") ? [response.headers.get("set-cookie") as string] : [];
    const cookieObservations = setCookies.map((value) => ({
      secure: /(?:^|;)\s*secure(?:;|$)/i.test(value),
      httpOnly: /(?:^|;)\s*httponly(?:;|$)/i.test(value),
      sameSite: /(?:^|;)\s*samesite=(?:strict|lax|none)(?:;|$)/i.test(value),
    }));
    const text = await response.text();
    if (Buffer.byteLength(text, "utf8") > MAX_RESPONSE_BYTES) throw new Error("The API response is larger than the 1 MB monitor limit.");
    let body: JsonValue | null = null;
    try { body = text ? JSON.parse(text) as JsonValue : null; } catch { /* Report invalid JSON below. */ }
    const jsonValid = body !== null;
    return {
      ok: response.ok && jsonValid,
      statusCode: response.status,
      body,
      durationMs: Date.now() - started,
      errorMessage: response.ok && !jsonValid ? "The endpoint did not return valid JSON." : response.ok ? null : `HTTP ${response.status}`,
      security: { https: url.protocol === "https:", headers: observedHeaders, cookies: cookieObservations },
    };
  } catch (error) {
    return { ok: false, statusCode: null, body: null, durationMs: Date.now() - started, errorMessage: error instanceof Error ? error.message : "The endpoint request failed.", security: { https: input.trim().startsWith("https://"), headers: {}, cookies: [] } };
  }
}
