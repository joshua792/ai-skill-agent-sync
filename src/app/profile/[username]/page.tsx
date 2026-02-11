import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { AssetCard } from "@/components/assets/asset-card";
import { Calendar, Package } from "lucide-react";
import { formatDate } from "@/lib/format";

interface Props {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const user = await db.user.findUnique({
    where: { username },
    select: { displayName: true, username: true },
  });
  if (!user) return { title: "User Not Found" };
  return {
    title: user.displayName ?? `@${user.username}`,
    description: `Public profile of ${user.displayName ?? user.username}`,
  };
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params;

  const user = await db.user.findUnique({
    where: { username },
    include: {
      assets: {
        where: { visibility: "PUBLIC", deletedAt: null },
        orderBy: { downloadCount: "desc" },
        include: {
          author: {
            select: { username: true, displayName: true, avatarUrl: true },
          },
        },
      },
    },
  });

  if (!user) notFound();

  const totalDownloads = user.assets.reduce(
    (sum, a) => sum + a.downloadCount,
    0
  );

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Profile Header */}
      <div className="flex items-start gap-6 mb-8">
        <Avatar className="size-20">
          <AvatarFallback className="text-2xl">
            {(user.displayName ?? user.username).charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">
            {user.displayName ?? user.username}
          </h1>
          <p className="text-muted-foreground">@{user.username}</p>
          {user.bio && (
            <p className="mt-2 text-sm text-muted-foreground max-w-xl">
              {user.bio}
            </p>
          )}
          <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Package className="size-3.5" />
              {user.assets.length} public asset{user.assets.length !== 1 && "s"}
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="size-3.5" />
              Joined {formatDate(user.createdAt)}
            </div>
            {totalDownloads > 0 && (
              <span>{totalDownloads.toLocaleString()} total downloads</span>
            )}
          </div>
        </div>
      </div>

      <Separator className="mb-8" />

      {/* Public Assets */}
      <h2 className="text-lg font-semibold mb-4">Public Assets</h2>
      {user.assets.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {user.assets.map((asset) => (
            <AssetCard key={asset.slug} asset={asset} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">
            This user hasn&apos;t published any public assets yet.
          </p>
        </div>
      )}
    </div>
  );
}
