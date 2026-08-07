import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-08-03T00:00:00-04:00");
  return [
    { url: "https://pallosagent.info/", lastModified, changeFrequency: "weekly", priority: 1 },
    { url: "https://pallosagent.info/privacy", lastModified, changeFrequency: "monthly", priority: 0.3 },
    { url: "https://pallosagent.info/terms", lastModified, changeFrequency: "monthly", priority: 0.3 },
  ];
}
