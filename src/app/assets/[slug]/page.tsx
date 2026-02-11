import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { AssetDetailHeader } from "@/components/assets/asset-detail-header";
import { AssetDetailContent } from "@/components/assets/asset-detail-content";
import { AssetDetailSidebar } from "@/components/assets/asset-detail-sidebar";
import { AssetVersionHistory } from "@/components/assets/asset-version-history";
import { AssetActions } from "@/components/assets/asset-actions";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const asset = await db.asset.findUnique({
    where: { slug },
    select: { name: true, description: true },
  });
  if (!asset) return { title: "Asset Not Found" };
  return { title: asset.name, description: asset.description };
}

export default async function AssetDetailPage({ params }: Props) {
  const { slug } = await params;

  const asset = await db.asset.findUnique({
    where: { slug },
    include: {
      author: {
        select: {
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
      versions: { orderBy: { createdAt: "desc" } },
      forkedFrom: {
        select: {
          name: true,
          slug: true,
          author: {
            select: { username: true, displayName: true },
          },
        },
      },
    },
  });

  if (!asset || asset.deletedAt) notFound();

  const user = await currentUser();
  const isOwner = user?.id === asset.authorId;

  if (asset.visibility === "PRIVATE" && !isOwner) notFound();

  return (
    <div className="container mx-auto px-4 py-8">
      <AssetDetailHeader asset={asset} />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8 mt-8">
        {/* Main content area */}
        <div className="space-y-8">
          <div>
            <p className="text-muted-foreground">{asset.description}</p>
            {asset.longDescription && (
              <div className="mt-4 text-sm text-muted-foreground">
                {asset.longDescription}
              </div>
            )}
          </div>

          <AssetDetailContent
            content={asset.content}
            fileName={asset.primaryFileName}
          />

          <AssetVersionHistory
            versions={JSON.parse(JSON.stringify(asset.versions))}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <AssetActions asset={asset} isOwner={isOwner} />
          <AssetDetailSidebar asset={asset} />
        </div>
      </div>
    </div>
  );
}
