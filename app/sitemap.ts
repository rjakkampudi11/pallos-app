import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-09-08T00:00:00-04:00");
  return [
    { url: "https://pallosagent.com/", lastModified, changeFrequency: "weekly", priority: 1 },
    { url: "https://pallosagent.com/security", lastModified, changeFrequency: "monthly", priority: 0.6 },
    { url: "https://pallosagent.com/methodology", lastModified, changeFrequency: "monthly", priority: 0.7 },
    { url: "https://pallosagent.com/proof", lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: "https://pallosagent.com/scan", lastModified, changeFrequency: "weekly", priority: 0.9 },
    { url: "https://pallosagent.com/privacy", lastModified, changeFrequency: "monthly", priority: 0.3 },
    { url: "https://pallosagent.com/terms", lastModified, changeFrequency: "monthly", priority: 0.3 },
    { url: "https://pallosagent.com/cookies", lastModified, changeFrequency: "monthly", priority: 0.3 },
    { url: "https://pallosagent.com/guides/ai-code-security-checklist", lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: "https://pallosagent.com/guides/supabase-security-checklist", lastModified, changeFrequency: "monthly", priority: 0.7 },
  ];
}
