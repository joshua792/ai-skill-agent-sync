import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CATEGORY_LABELS,
  LICENSE_LABELS,
  INSTALL_SCOPE_LABELS,
  PLATFORM_LABELS,
} from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { Download, GitFork, Calendar, Tag } from "lucide-react";

interface AssetDetailSidebarProps {
  asset: {
    category: string;
    tags: string[];
    license: string;
    installScope: string;
    currentVersion: string;
    downloadCount: number;
    forkCount: number;
    compatiblePlatforms: string[];
    createdAt: Date;
  };
}

export function AssetDetailSidebar({ asset }: AssetDetailSidebarProps) {
  return (
    <div className="rounded-lg border p-4 space-y-4">
      {/* Version */}
      <div>
        <p className="text-xs text-muted-foreground mb-1">Version</p>
        <p className="text-sm font-medium">v{asset.currentVersion}</p>
      </div>
      <Separator />

      {/* Stats */}
      <div className="flex gap-4">
        <div className="flex items-center gap-1.5 text-sm">
          <Download className="size-3.5 text-muted-foreground" />
          {asset.downloadCount}
        </div>
        <div className="flex items-center gap-1.5 text-sm">
          <GitFork className="size-3.5 text-muted-foreground" />
          {asset.forkCount}
        </div>
      </div>
      <Separator />

      {/* Category */}
      <div>
        <p className="text-xs text-muted-foreground mb-1">Category</p>
        <p className="text-sm">
          {CATEGORY_LABELS[asset.category] ?? asset.category}
        </p>
      </div>

      {/* License */}
      <div>
        <p className="text-xs text-muted-foreground mb-1">License</p>
        <p className="text-sm">
          {LICENSE_LABELS[asset.license] ?? asset.license}
        </p>
      </div>

      {/* Install Scope */}
      <div>
        <p className="text-xs text-muted-foreground mb-1">Install Scope</p>
        <p className="text-sm">
          {INSTALL_SCOPE_LABELS[asset.installScope] ?? asset.installScope}
        </p>
      </div>
      <Separator />

      {/* Compatible Platforms */}
      {asset.compatiblePlatforms.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-1.5">
            Compatible With
          </p>
          <div className="flex flex-wrap gap-1">
            {asset.compatiblePlatforms.map((p) => (
              <Badge key={p} variant="secondary" className="text-xs">
                {PLATFORM_LABELS[p] ?? p}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Tags */}
      {asset.tags.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-1.5">Tags</p>
          <div className="flex flex-wrap gap-1">
            {asset.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs gap-1">
                <Tag className="size-2.5" />
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <Separator />

      {/* Created date */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Calendar className="size-3" />
        Created {formatDate(asset.createdAt)}
      </div>
    </div>
  );
}
