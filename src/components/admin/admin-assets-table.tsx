"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MoreHorizontal, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ASSET_TYPE_LABELS, VISIBILITY_LABELS } from "@/lib/constants";
import { adminDeleteAsset, adminRestoreAsset } from "@/lib/actions/admin";

interface AssetRow {
  id: string;
  slug: string;
  name: string;
  type: string;
  primaryPlatform: string;
  visibility: string;
  downloadCount: number;
  forkCount: number;
  createdAt: string;
  deletedAt: string | null;
  authorUsername: string;
  authorDisplayName: string | null;
}

interface AdminAssetsTableProps {
  assets: AssetRow[];
}

type StatusFilter = "all" | "active" | "deleted";

export function AdminAssetsTable({ assets }: AdminAssetsTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [visibilityFilter, setVisibilityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [actionTarget, setActionTarget] = useState<{
    asset: AssetRow;
    action: "delete" | "restore";
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const q = search.toLowerCase();
  const filtered = assets.filter((a) => {
    if (q && !a.name.toLowerCase().includes(q) && !a.authorUsername.toLowerCase().includes(q)) {
      return false;
    }
    if (typeFilter !== "all" && a.type !== typeFilter) return false;
    if (visibilityFilter !== "all" && a.visibility !== visibilityFilter) return false;
    if (statusFilter === "active" && a.deletedAt !== null) return false;
    if (statusFilter === "deleted" && a.deletedAt === null) return false;
    return true;
  });

  async function handleAction() {
    if (!actionTarget) return;
    setLoading(true);
    try {
      const result =
        actionTarget.action === "delete"
          ? await adminDeleteAsset(actionTarget.asset.id)
          : await adminRestoreAsset(actionTarget.asset.id);
      if (result.success) {
        toast.success(
          actionTarget.action === "delete"
            ? `"${actionTarget.asset.name}" deleted`
            : `"${actionTarget.asset.name}" restored`
        );
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
      setActionTarget(null);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search assets or authors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-64"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[130px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(ASSET_TYPE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={visibilityFilter} onValueChange={setVisibilityFilter}>
          <SelectTrigger className="w-full sm:w-[130px]">
            <SelectValue placeholder="Visibility" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {Object.entries(VISIBILITY_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as StatusFilter)}
        >
          <SelectTrigger className="w-full sm:w-[130px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="deleted">Deleted</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground ml-auto">
          {filtered.length} asset{filtered.length !== 1 && "s"}
        </span>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="hidden sm:table-cell">Author</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="hidden md:table-cell">Visibility</TableHead>
              <TableHead className="text-right">DLs</TableHead>
              <TableHead className="text-right hidden sm:table-cell">
                Forks
              </TableHead>
              <TableHead className="hidden lg:table-cell">Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((a) => (
              <TableRow
                key={a.id}
                className={a.deletedAt ? "opacity-50" : undefined}
              >
                <TableCell>
                  <Link
                    href={`/assets/${a.slug}`}
                    className="font-medium text-sm hover:underline"
                  >
                    {a.name}
                  </Link>
                </TableCell>
                <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                  @{a.authorUsername}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-xs">
                    {ASSET_TYPE_LABELS[a.type] ?? a.type}
                  </Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm">
                  {VISIBILITY_LABELS[a.visibility] ?? a.visibility}
                </TableCell>
                <TableCell className="text-right text-sm">
                  {a.downloadCount}
                </TableCell>
                <TableCell className="text-right text-sm hidden sm:table-cell">
                  {a.forkCount}
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  {a.deletedAt ? (
                    <Badge variant="destructive" className="text-xs">
                      Deleted
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-xs text-green-600 border-green-600"
                    >
                      Active
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/assets/${a.slug}`}>View Asset</Link>
                      </DropdownMenuItem>
                      {a.deletedAt ? (
                        <DropdownMenuItem
                          onClick={() =>
                            setActionTarget({ asset: a, action: "restore" })
                          }
                        >
                          Restore Asset
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() =>
                            setActionTarget({ asset: a, action: "delete" })
                          }
                        >
                          Delete Asset
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <p className="text-muted-foreground">No assets found.</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={actionTarget !== null}
        onOpenChange={(open) => !open && setActionTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionTarget?.action === "delete"
                ? "Delete Asset"
                : "Restore Asset"}
            </DialogTitle>
            <DialogDescription>
              {actionTarget?.action === "delete"
                ? `Are you sure you want to delete "${actionTarget?.asset.name}"? The asset will be soft-deleted and can be restored later.`
                : `Are you sure you want to restore "${actionTarget?.asset.name}"? It will become visible again.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActionTarget(null)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant={
                actionTarget?.action === "delete" ? "destructive" : "default"
              }
              onClick={handleAction}
              disabled={loading}
            >
              {loading
                ? actionTarget?.action === "delete"
                  ? "Deleting..."
                  : "Restoring..."
                : actionTarget?.action === "delete"
                  ? "Delete"
                  : "Restore"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
