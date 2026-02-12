import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://assetvault.dev";

  const assets = await db.asset.findMany({
    where: { visibility: "PUBLIC", deletedAt: null },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
    take: 5000,
  });

  const users = await db.user.findMany({
    select: { username: true, updatedAt: true },
    take: 5000,
  });

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date() },
    { url: `${baseUrl}/explore`, lastModified: new Date() },
  ];

  const assetPages: MetadataRoute.Sitemap = assets.map((a) => ({
    url: `${baseUrl}/assets/${a.slug}`,
    lastModified: a.updatedAt,
  }));

  const profilePages: MetadataRoute.Sitemap = users.map((u) => ({
    url: `${baseUrl}/profile/${u.username}`,
    lastModified: u.updatedAt,
  }));

  return [...staticPages, ...assetPages, ...profilePages];
}
