import Link from "next/link";
import { formatDistanceToNow } from "@/lib/format";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { AssetTypeBadge } from "./asset-type-badge";
import { PlatformBadge } from "./platform-badge";
import { VisibilityBadge } from "./visibility-badge";
import { Download } from "lucide-react";

interface AssetCardProps {
  asset: {
    slug: string;
    name: string;
    description: string;
    type: string;
    primaryPlatform: string;
    visibility: string;
    downloadCount: number;
    updatedAt: Date;
    author?: {
      username: string;
      displayName: string | null;
      avatarUrl: string | null;
    };
  };
  showAuthor?: boolean;
  showVisibility?: boolean;
}

export function AssetCard({
  asset,
  showAuthor = false,
  showVisibility = false,
}: AssetCardProps) {
  return (
    <Link href={`/assets/${asset.slug}`} className="group">
      <Card className="h-full transition-colors hover:border-primary/50">
        <CardHeader>
          <div className="flex items-center gap-2 flex-wrap">
            <AssetTypeBadge type={asset.type} />
            <PlatformBadge platform={asset.primaryPlatform} />
            {showVisibility && (
              <VisibilityBadge visibility={asset.visibility} />
            )}
          </div>
          <CardTitle className="text-base group-hover:text-primary transition-colors">
            {asset.name}
          </CardTitle>
          <CardDescription className="line-clamp-2">
            {asset.description}
          </CardDescription>
        </CardHeader>
        <CardFooter className="text-xs text-muted-foreground justify-between">
          <div className="flex items-center gap-1">
            <Download className="size-3" />
            {asset.downloadCount}
          </div>
          {showAuthor && asset.author && (
            <span>
              by {asset.author.displayName ?? asset.author.username}
            </span>
          )}
          <span>{formatDistanceToNow(asset.updatedAt)}</span>
        </CardFooter>
      </Card>
    </Link>
  );
}
