import type { MetadataRoute } from "next";
import { getDb } from "@/db";
import { publishedPackages, publishedDestinations, publishedPosts } from "@/lib/catalogue";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const db = await getDb();
  const [pkgs, dests, posts] = await Promise.all([publishedPackages(db), publishedDestinations(db), publishedPosts(db)]);
  const statics = ["", "/packages", "/destinations", "/custom-trip", "/about", "/reviews", "/gallery", "/guides", "/contact", "/privacy", "/terms"];
  return [
    ...statics.map((p) => ({ url: `${site}${p}`, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.6 })),
    ...dests.map((d) => ({ url: `${site}/destinations/${d.slug}`, lastModified: d.updatedAt, priority: 0.8 })),
    ...pkgs.map((p) => ({ url: `${site}/packages/${p.slug}`, lastModified: p.updatedAt, priority: 0.9 })),
    ...posts.map((p) => ({ url: `${site}/guides/${p.slug}`, lastModified: p.updatedAt, priority: 0.5 })),
  ];
}
