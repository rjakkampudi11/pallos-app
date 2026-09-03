import { describeSchema, type EndpointSnapshot } from "./monitoring.ts";

export type FreeScanSummary = {
  hostname: string;
  statusCode: number | null;
  durationMs: number;
  outcome: "healthy" | "warning" | "error";
  rootType: string | null;
  fieldCount: number;
  fields: Array<{ path: string; type: string }>;
  checks: {
    https: true;
    publicNetwork: true;
    httpSuccess: boolean;
    validJson: boolean;
  };
  message: string;
};

const MAX_VISIBLE_FIELDS = 12;
const PALLOS_DEMO_HOSTS = new Set(["pallosagent.com", "pallosagent.info", "www.pallosagent.com", "www.pallosagent.info"]);

export function isPallosDemoUrl(url: URL): boolean {
  return PALLOS_DEMO_HOSTS.has(url.hostname.toLowerCase())
    && url.pathname === "/api/training/profile"
    && url.search === "";
}

export function summarizeFreeScan(url: URL, snapshot: EndpointSnapshot): FreeScanSummary {
  const schema = snapshot.body === null ? {} : describeSchema(snapshot.body);
  const fields = Object.entries(schema)
    .filter(([path]) => path !== "$")
    .slice(0, MAX_VISIBLE_FIELDS)
    .map(([path, type]) => ({ path, type }));
  const httpSuccess = snapshot.statusCode !== null && snapshot.statusCode >= 200 && snapshot.statusCode < 300;
  const validJson = snapshot.body !== null;
  const outcome = httpSuccess && validJson ? "healthy" : snapshot.statusCode !== null ? "warning" : "error";

  return {
    hostname: url.hostname,
    statusCode: snapshot.statusCode,
    durationMs: snapshot.durationMs,
    outcome,
    rootType: schema.$ || null,
    fieldCount: Math.max(0, Object.keys(schema).length - 1),
    fields,
    checks: { https: true, publicNetwork: true, httpSuccess, validJson },
    message: outcome === "healthy"
      ? "This endpoint is ready for a saved baseline. Pallos found valid JSON without exposing any response values."
      : snapshot.errorMessage || "This endpoint did not return a successful JSON response.",
  };
}
