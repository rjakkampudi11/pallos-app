import type { MetadataRoute } from "next";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = (await headers()).get("host")?.split(":")[0] || "pallosagent.info";
  if (host.endsWith("pallosagent.com")) return { rules: { userAgent: "*", disallow: "/" } };
  return { rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/internal/", "/login", "/agent", "/app/"] }], sitemap: "https://pallosagent.info/sitemap.xml", host: "https://pallosagent.info" };
}
