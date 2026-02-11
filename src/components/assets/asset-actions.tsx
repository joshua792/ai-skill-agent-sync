"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Pencil,
  Trash2,
  GitFork,
  Copy,
  Upload,
  Download,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  deleteAsset,
  publishVersion,
  downloadAsset,
  forkAsset,
} from "@/lib/actions/asset";

interface AssetActionsProps {
  asset: {
    id: string;
    slug: string;
    content: string | null;
    currentVersion: string;
    visibility: string;
    storageType: string;
    bundleUrl?: string | null;
  };
  isOwner: boolean;
}

export function AssetActions({ asset, isOwner }: AssetActionsProps) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [versionOpen, setVersionOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [forking, setForking] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    const result = await deleteAsset(asset.id);
    if (result.success) {
      toast.success("Asset deleted");
      router.push("/dashboard");
    } else {
      toast.error(result.error);
    }
    setDeleting(false);
    setDeleteOpen(false);
  }

  async function handleCopyContent() {
    if (asset.content) {
      await navigator.clipboard.writeText(asset.content);
      toast.success("Content copied to clipboard!");
    }
  }

  async function handleDownload() {
    setDownloading(true);

    if (asset.storageType === "BUNDLE" && asset.bundleUrl) {
      // Bundle download — open blob URL directly
      window.open(asset.bundleUrl, "_blank");
      const result = await downloadAsset(asset.id, asset.currentVersion);
      if (result.success) {
        toast.success("Bundle downloaded!");
      }
    } else if (asset.content) {
      // Inline download — create a file
      const blob = new Blob([asset.content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = asset.slug + ".md";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const result = await downloadAsset(asset.id, asset.currentVersion);
      if (result.success) {
        toast.success("Asset downloaded!");
      }
    }

    setDownloading(false);
  }

  async function handleShare() {
    const url = `${window.location.origin}/assets/${asset.slug}`;
    await navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard!");
  }

  async function handleFork() {
    setForking(true);
    const result = await forkAsset(asset.id);
    if (result.success) {
      toast.success("Asset forked! You can now customize it.");
      router.push(`/assets/${result.slug}`);
    } else {
      toast.error(result.error);
    }
    setForking(false);
  }

  async function handlePublishVersion(formData: FormData) {
    setPublishing(true);
    formData.set("assetId", asset.id);
    const result = await publishVersion(formData);
    if (result.success) {
      toast.success("Version published!");
      setVersionOpen(false);
      router.refresh();
    } else {
      toast.error(result.error);
    }
    setPublishing(false);
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Download + Share (always visible for non-private) */}
      <Button
        variant="default"
        className="w-full gap-2"
        onClick={handleDownload}
        disabled={downloading || (!asset.content && !asset.bundleUrl)}
      >
        <Download className="size-3.5" />
        {downloading ? "Downloading..." : "Download"}
      </Button>

      {asset.visibility !== "PRIVATE" && (
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={handleShare}
        >
          <Share2 className="size-3.5" /> Share Link
        </Button>
      )}

      <Button
        variant="outline"
        className="w-full gap-2"
        onClick={handleCopyContent}
        disabled={!asset.content}
      >
        <Copy className="size-3.5" /> Copy Content
      </Button>

      {!isOwner && (
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={handleFork}
          disabled={forking}
        >
          <GitFork className="size-3.5" />
          {forking ? "Forking..." : "Fork"}
        </Button>
      )}

      {isOwner && (
        <>
          <div className="border-t my-2" />

          <Link href={`/dashboard/assets/${asset.slug}/edit`}>
            <Button variant="outline" className="w-full gap-2">
              <Pencil className="size-3.5" /> Edit
            </Button>
          </Link>

          {/* Publish Version Dialog */}
          <Dialog open={versionOpen} onOpenChange={setVersionOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full gap-2">
                <Upload className="size-3.5" /> Publish Version
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Publish New Version</DialogTitle>
                <DialogDescription>
                  Create a new version snapshot of this asset.
                </DialogDescription>
              </DialogHeader>
              <form action={handlePublishVersion} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="version">Version (semver)</Label>
                  <Input
                    id="version"
                    name="version"
                    placeholder="1.2.0"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="changelog">Changelog</Label>
                  <Textarea
                    id="changelog"
                    name="changelog"
                    placeholder="What changed..."
                    required
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={publishing}>
                    {publishing ? "Publishing..." : "Publish"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Delete Dialog */}
          <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" className="w-full gap-2">
                <Trash2 className="size-3.5" /> Delete
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Asset</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete this asset? This action can be
                  undone by an administrator.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDeleteOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? "Deleting..." : "Delete"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
