import Link from "next/link";
import { formatDistanceToNow } from "@/lib/format";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AssetTypeBadge } from "./asset-type-badge";
import { PlatformBadge } from "./platform-badge";
import { VisibilityBadge } from "./visibility-badge";
import { Download, GitFork } from "lucide-react";
import { LICENSE_LABELS } from "@/lib/constants";

interface AssetCardProps {
  asset: {
    slug: string;
    name: string;
    description: string;
    type: string;
    primaryPlatform: string;
    visibility: string;
    downloadCount: number;
    forkCount: number;
    forkedFromId?: string | null;
    license: string;
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
            {asset.license !== "UNLICENSED" && (
              <Badge variant="outline" className="text-xs">
                {LICENSE_LABELS[asset.license] ?? asset.license}
              </Badge>
            )}
          </div>
          <CardTitle className="text-base group-hover:text-primary transition-colors flex items-center gap-1.5">
            {asset.forkedFromId && (
              <GitFork className="size-3 text-muted-foreground shrink-0" />
            )}
            {asset.name}
          </CardTitle>
          <CardDescription className="line-clamp-2">
            {asset.description}
          </CardDescription>
        </CardHeader>
        <CardFooter className="text-xs text-muted-foreground justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Download className="size-3" />
              {asset.downloadCount}
            </div>
            <div className="flex items-center gap-1">
              <GitFork className="size-3" />
              {asset.forkCount}
            </div>
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
