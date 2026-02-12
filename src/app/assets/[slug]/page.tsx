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
  searchParams: Promise<{ token?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://assetvault.dev";
  const asset = await db.asset.findUnique({
    where: { slug },
    select: {
      name: true,
      description: true,
      type: true,
      primaryPlatform: true,
      author: { select: { displayName: true, username: true } },
    },
  });
  if (!asset) return { title: "Asset Not Found" };

  const title = asset.name;
  const description = asset.description;
  const url = `${baseUrl}/assets/${slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "article",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function AssetDetailPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { token } = await searchParams;

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

  // SHARED access control: owner + explicitly shared users only
  let isSharedAccess = false;
  if (asset.visibility === "SHARED" && !isOwner) {
    const userEmail = user?.emailAddresses?.[0]?.emailAddress;
    const hasAccess = await db.assetShare.findFirst({
      where: {
        assetId: asset.id,
        OR: [
          ...(token ? [{ token }] : []),
          ...(userEmail ? [{ email: userEmail.toLowerCase() }] : []),
        ],
      },
    });
    if (!hasAccess) notFound();
    isSharedAccess = true;
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://assetvault.dev";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareSourceCode",
    name: asset.name,
    description: asset.description,
    author: {
      "@type": "Person",
      name: asset.author.displayName ?? asset.author.username,
      url: `${baseUrl}/profile/${asset.author.username}`,
    },
    version: asset.currentVersion,
    license: asset.license,
    dateCreated: asset.createdAt,
    dateModified: asset.updatedAt,
    url: `${baseUrl}/assets/${asset.slug}`,
  };

  return (
    <>
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
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
            storageType={asset.storageType}
            bundleManifest={asset.bundleManifest as import("@/lib/types/bundle").BundleManifest | null}
          />

          <AssetVersionHistory
            versions={JSON.parse(JSON.stringify(asset.versions))}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <AssetActions
            asset={asset}
            isOwner={isOwner}
            isSharedAccess={isSharedAccess}
          />
          <AssetDetailSidebar asset={asset} />
        </div>
      </div>
    </div>
    </>
  );
}
