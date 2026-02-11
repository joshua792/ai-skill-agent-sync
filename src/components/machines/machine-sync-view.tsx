"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, Check } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { AssetTypeBadge } from "@/components/assets/asset-type-badge";
import { SyncStatusBadge } from "./sync-status-badge";
import {
  syncAssetToMachine,
  markAssetSynced,
} from "@/lib/actions/machine";

interface SerializedSyncState {
  id: string;
  machineId: string;
  assetId: string;
  syncedVersion: string;
  syncedAt: string;
}

interface SerializedMachine {
  id: string;
  name: string;
  machineIdentifier: string;
  lastSyncAt: string | null;
  createdAt: string;
  syncStates: SerializedSyncState[];
}

interface SerializedAsset {
  id: string;
  slug: string;
  name: string;
  type: string;
  primaryPlatform: string;
  currentVersion: string;
  content: string | null;
  primaryFileName: string;
}

interface MachineSyncViewProps {
  machine: SerializedMachine;
  assets: SerializedAsset[];
}

type SyncStatus = "up_to_date" | "outdated" | "not_synced";

function getSyncStatus(
  asset: SerializedAsset,
  syncState: SerializedSyncState | undefined
): SyncStatus {
  if (!syncState) return "not_synced";
  return syncState.syncedVersion === asset.currentVersion
    ? "up_to_date"
    : "outdated";
}

export function MachineSyncView({ machine, assets }: MachineSyncViewProps) {
  const router = useRouter();
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");

  const syncMap = new Map(
    machine.syncStates.map((s) => [s.assetId, s])
  );

  const assetsWithStatus = assets.map((asset) => {
    const syncState = syncMap.get(asset.id);
    return {
      asset,
      syncState,
      status: getSyncStatus(asset, syncState),
    };
  });

  const upToDateCount = assetsWithStatus.filter(
    (a) => a.status === "up_to_date"
  ).length;
  const outdatedCount = assetsWithStatus.filter(
    (a) => a.status === "outdated"
  ).length;
  const notSyncedCount = assetsWithStatus.filter(
    (a) => a.status === "not_synced"
  ).length;

  const filtered =
    statusFilter === "ALL"
      ? assetsWithStatus
      : assetsWithStatus.filter((a) => a.status === statusFilter);

  async function handleDownloadAndSync(asset: SerializedAsset) {
    if (!asset.content) {
      toast.error("No content available to download");
      return;
    }

    setSyncingId(asset.id);

    // Download the file
    const blob = new Blob([asset.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = asset.primaryFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Record the sync
    const formData = new FormData();
    formData.set("machineId", machine.id);
    formData.set("assetId", asset.id);
    const result = await syncAssetToMachine(formData);

    if (result.success) {
      toast.success("Asset downloaded and synced!");
      router.refresh();
    } else {
      toast.error(result.error);
    }
    setSyncingId(null);
  }

  async function handleMarkSynced(assetId: string) {
    setMarkingId(assetId);
    const result = await markAssetSynced(machine.id, assetId);
    if (result.success) {
      toast.success("Asset marked as synced!");
      router.refresh();
    } else {
      toast.error(result.error);
    }
    setMarkingId(null);
  }

  if (assets.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <p className="text-muted-foreground">
          You don&apos;t have any assets yet. Create your first asset to start
          syncing.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="p-4">
            <p className="text-xs text-muted-foreground">Total</p>
            <CardTitle className="text-2xl">{assets.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="p-4">
            <p className="text-xs text-green-400">Up to date</p>
            <CardTitle className="text-2xl text-green-400">
              {upToDateCount}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="p-4">
            <p className="text-xs text-yellow-400">Outdated</p>
            <CardTitle className="text-2xl text-yellow-400">
              {outdatedCount}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="p-4">
            <p className="text-xs text-muted-foreground">Not synced</p>
            <CardTitle className="text-2xl">{notSyncedCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filter tabs */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList>
          <TabsTrigger value="ALL">All ({assets.length})</TabsTrigger>
          <TabsTrigger value="outdated">
            Outdated ({outdatedCount})
          </TabsTrigger>
          <TabsTrigger value="not_synced">
            Not Synced ({notSyncedCount})
          </TabsTrigger>
          <TabsTrigger value="up_to_date">
            Up to Date ({upToDateCount})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Sync table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Current</TableHead>
              <TableHead>Synced</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length > 0 ? (
              filtered.map(({ asset, syncState, status }) => (
                <TableRow key={asset.id}>
                  <TableCell>
                    <Link
                      href={`/assets/${asset.slug}`}
                      className="font-medium hover:text-primary transition-colors"
                    >
                      {asset.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <AssetTypeBadge type={asset.type} />
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    v{asset.currentVersion}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {syncState ? (
                      `v${syncState.syncedVersion}`
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <SyncStatusBadge status={status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant={status === "up_to_date" ? "outline" : "default"}
                        className="gap-1.5"
                        onClick={() => handleDownloadAndSync(asset)}
                        disabled={
                          syncingId === asset.id || !asset.content
                        }
                      >
                        <Download className="size-3" />
                        {syncingId === asset.id
                          ? "Syncing..."
                          : "Download & Sync"}
                      </Button>
                      {status !== "up_to_date" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          onClick={() => handleMarkSynced(asset.id)}
                          disabled={markingId === asset.id}
                        >
                          <Check className="size-3" />
                          {markingId === asset.id
                            ? "Marking..."
                            : "Mark Synced"}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground py-8"
                >
                  No assets match this filter.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
