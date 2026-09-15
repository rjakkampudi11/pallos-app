import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/internal/", "/login", "/agent", "/app/", "/home", "/monitor", "/findings", "/projects", "/agent-runs", "/connections", "/insights", "/activity", "/settings", "/contact"] }], sitemap: "https://pallosagent.com/sitemap.xml", host: "https://pallosagent.com" };
}
