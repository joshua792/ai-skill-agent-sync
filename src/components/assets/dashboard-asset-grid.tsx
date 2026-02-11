"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { AssetCard } from "./asset-card";

interface SerializedAsset {
  slug: string;
  name: string;
  description: string;
  type: string;
  primaryPlatform: string;
  visibility: string;
  downloadCount: number;
  updatedAt: string;
}

interface DashboardAssetGridProps {
  assets: SerializedAsset[];
}

export function DashboardAssetGrid({ assets }: DashboardAssetGridProps) {
  const [typeFilter, setTypeFilter] = useState("ALL");

  const filtered =
    typeFilter === "ALL"
      ? assets
      : assets.filter((a) => a.type === typeFilter);

  if (assets.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <p className="text-muted-foreground mb-4">
          You haven&apos;t created any assets yet. Create your first one to get
          started.
        </p>
        <Link href="/dashboard/assets/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create Asset
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Tabs value={typeFilter} onValueChange={setTypeFilter}>
        <TabsList>
          <TabsTrigger value="ALL">All ({assets.length})</TabsTrigger>
          <TabsTrigger value="SKILL">
            Skills ({assets.filter((a) => a.type === "SKILL").length})
          </TabsTrigger>
          <TabsTrigger value="COMMAND">
            Commands ({assets.filter((a) => a.type === "COMMAND").length})
          </TabsTrigger>
          <TabsTrigger value="AGENT">
            Agents ({assets.filter((a) => a.type === "AGENT").length})
          </TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-6">
        {filtered.map((asset) => (
          <AssetCard
            key={asset.slug}
            asset={{ ...asset, updatedAt: new Date(asset.updatedAt) }}
            showVisibility
          />
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full text-center text-muted-foreground py-8">
            No {typeFilter.toLowerCase()} assets found.
          </p>
        )}
      </div>
    </div>
  );
}
