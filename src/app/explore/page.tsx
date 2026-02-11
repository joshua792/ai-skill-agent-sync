import type { Metadata } from "next";
import { Suspense } from "react";
import { Search } from "lucide-react";
import { db } from "@/lib/db";
import { ExploreFilters } from "@/components/assets/explore-filters";
import { AssetCard } from "@/components/assets/asset-card";
import type { Prisma } from "@/generated/prisma/client";

export const metadata: Metadata = {
  title: "Explore",
};

interface Props {
  searchParams: Promise<{
    q?: string;
    type?: string;
    platform?: string;
    category?: string;
  }>;
}

export default async function ExplorePage({ searchParams }: Props) {
  const { q, type, platform, category } = await searchParams;

  const where: Prisma.AssetWhereInput = {
    visibility: "PUBLIC",
    deletedAt: null,
  };

  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }
  if (type && type !== "ALL") {
    where.type = type as Prisma.AssetWhereInput["type"];
  }
  if (platform && platform !== "ALL") {
    where.primaryPlatform = platform as Prisma.AssetWhereInput["primaryPlatform"];
  }
  if (category && category !== "ALL") {
    where.category = category as Prisma.AssetWhereInput["category"];
  }

  const assets = await db.asset.findMany({
    where,
    include: {
      author: {
        select: { username: true, displayName: true, avatarUrl: true },
      },
    },
    orderBy: { downloadCount: "desc" },
    take: 50,
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Search className="h-6 w-6 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Explore Assets</h1>
      </div>

      <Suspense>
        <ExploreFilters />
      </Suspense>

      {assets.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-6">
          {assets.map((asset) => (
            <AssetCard key={asset.slug} asset={asset} showAuthor />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-12 text-center mt-6">
          <p className="text-muted-foreground">
            No assets found. Try adjusting your search or filters.
          </p>
        </div>
      )}
    </div>
  );
}
