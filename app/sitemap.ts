import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { professor } from "@/database/schema";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const professors = await db
    .select({ slug: professor.slug, updatedAt: professor.updatedAt })
    .from(professor)
    .limit(5000);

  return [
    {
      url: "https://libraryyy.com",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: "https://libraryyy.com/professors",
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: "https://libraryyy.com/privacy",
      lastModified: new Date("2026-03-05"),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: "https://libraryyy.com/terms",
      lastModified: new Date("2026-03-05"),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    ...professors.map((p) => ({
      url: `https://libraryyy.com/professors/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
