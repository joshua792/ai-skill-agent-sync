"use client";

import { formatDate } from "@/lib/format";

interface Version {
  id: string;
  version: string;
  changelog: string;
  createdAt: string;
}

interface AssetVersionHistoryProps {
  versions: Version[];
}

export function AssetVersionHistory({ versions }: AssetVersionHistoryProps) {
  if (versions.length === 0) return null;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Version History</h2>
      <div className="space-y-4">
        {versions.map((v, i) => (
          <div key={v.id} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="size-2.5 rounded-full bg-primary mt-1.5" />
              {i < versions.length - 1 && (
                <div className="w-px flex-1 bg-border" />
              )}
            </div>
            <div className="pb-4">
              <div className="flex items-baseline gap-2">
                <span className="font-medium text-sm">v{v.version}</span>
                <span className="text-xs text-muted-foreground">
                  {formatDate(new Date(v.createdAt))}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {v.changelog}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
