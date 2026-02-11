import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AssetTypeBadge } from "./asset-type-badge";
import { PlatformBadge } from "./platform-badge";
import { VisibilityBadge } from "./visibility-badge";

interface AssetDetailHeaderProps {
  asset: {
    name: string;
    type: string;
    primaryPlatform: string;
    visibility: string;
    installScope: string;
    author: {
      username: string;
      displayName: string | null;
      avatarUrl: string | null;
    };
  };
}

export function AssetDetailHeader({ asset }: AssetDetailHeaderProps) {
  return (
    <div>
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <AssetTypeBadge type={asset.type} />
        <PlatformBadge platform={asset.primaryPlatform} />
        <VisibilityBadge visibility={asset.visibility} />
      </div>
      <h1 className="text-3xl font-bold mb-2">{asset.name}</h1>
      <Link
        href={`/profile/${asset.author.username}`}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <Avatar className="size-5">
          <AvatarFallback className="text-[10px]">
            {(asset.author.displayName ?? asset.author.username)
              .charAt(0)
              .toUpperCase()}
          </AvatarFallback>
        </Avatar>
        {asset.author.displayName ?? asset.author.username}
      </Link>
    </div>
  );
}
