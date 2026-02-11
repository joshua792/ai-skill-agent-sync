"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  FolderOpen,
  Download,
  Check,
  AlertCircle,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AssetTypeBadge } from "@/components/assets/asset-type-badge";
import { syncAssetToMachine } from "@/lib/actions/machine";
import {
  getDefaultInstallSubdir,
  PLATFORM_LABELS,
} from "@/lib/constants";

interface InstallAsset {
  id: string;
  slug: string;
  name: string;
  type: string;
  primaryPlatform: string;
  currentVersion: string;
  content: string | null;
  primaryFileName: string;
  storageType: string;
  bundleUrl: string | null;
}

interface InstallToProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: InstallAsset;
  machineId: string;
  previousInstallPath?: string | null;
  onInstallComplete: () => void;
}

type Step = "pick" | "installing" | "done" | "error";

const isFileSystemAccessSupported =
  typeof window !== "undefined" && "showDirectoryPicker" in window;

export function InstallToProjectDialog({
  open,
  onOpenChange,
  asset,
  machineId,
  previousInstallPath,
  onInstallComplete,
}: InstallToProjectDialogProps) {
  const [step, setStep] = useState<Step>("pick");
  const [directoryHandle, setDirectoryHandle] =
    useState<FileSystemDirectoryHandle | null>(null);
  const [projectName, setProjectName] = useState("");
  const [subdir, setSubdir] = useState(
    getDefaultInstallSubdir(asset.primaryPlatform, asset.type)
  );
  const [errorMessage, setErrorMessage] = useState("");

  const targetPath = [projectName, subdir, asset.primaryFileName]
    .filter((p) => p && p !== ".")
    .join("/");

  function resetState() {
    setStep("pick");
    setDirectoryHandle(null);
    setProjectName("");
    setSubdir(getDefaultInstallSubdir(asset.primaryPlatform, asset.type));
    setErrorMessage("");
  }

  async function handlePickDirectory() {
    try {
      const handle = await window.showDirectoryPicker!({
        mode: "readwrite",
      });
      setDirectoryHandle(handle);
      setProjectName(handle.name);
    } catch (err) {
      // User cancelled the picker — not an error
      if (err instanceof DOMException && err.name === "AbortError") return;
      toast.error("Failed to open directory picker");
    }
  }

  async function handleInstall() {
    if (!directoryHandle) return;

    setStep("installing");
    try {
      const content = asset.content;
      if (!content) throw new Error("No content available to install");

      // Navigate/create subdirectory path
      let currentDir = directoryHandle;
      if (subdir && subdir !== ".") {
        const parts = subdir.split("/").filter(Boolean);
        for (const part of parts) {
          currentDir = await currentDir.getDirectoryHandle(part, {
            create: true,
          });
        }
      }

      // Write the file
      const fileHandle = await currentDir.getFileHandle(
        asset.primaryFileName,
        { create: true }
      );
      const writable = await fileHandle.createWritable();
      await writable.write(content);
      await writable.close();

      // Record the sync via server action
      const formData = new FormData();
      formData.set("machineId", machineId);
      formData.set("assetId", asset.id);
      formData.set("installPath", targetPath);
      const result = await syncAssetToMachine(formData);

      if (!result.success) throw new Error(result.error);

      setStep("done");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Installation failed"
      );
      setStep("error");
    }
  }

  function handleFallbackDownload() {
    if (asset.storageType === "BUNDLE" && asset.bundleUrl) {
      window.open(asset.bundleUrl, "_blank");
    } else if (asset.content) {
      const blob = new Blob([asset.content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = asset.primaryFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }

  // Unsupported browser fallback
  if (!isFileSystemAccessSupported) {
    const suggestedPath = [
      getDefaultInstallSubdir(asset.primaryPlatform, asset.type),
      asset.primaryFileName,
    ]
      .filter((p) => p && p !== ".")
      .join("/");

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Install to Project</DialogTitle>
            <DialogDescription>
              Your browser does not support the File System Access API. This
              feature requires Chrome or Edge 86+.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Download the file and manually place it in your project directory:
            </p>
            <code className="block text-xs bg-muted p-3 rounded-md font-mono">
              {suggestedPath}
            </code>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(suggestedPath);
                  toast.success("Path copied!");
                }}
              >
                Copy Path
              </Button>
              <Button
                className="flex-1 gap-1.5"
                onClick={() => {
                  handleFallbackDownload();
                  onOpenChange(false);
                }}
              >
                <Download className="size-3.5" />
                Download File
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetState();
        onOpenChange(v);
      }}
    >
      <DialogContent showCloseButton={step !== "installing"}>
        {/* ── Pick step ── */}
        {step === "pick" && (
          <>
            <DialogHeader>
              <DialogTitle>Install to Project</DialogTitle>
              <DialogDescription>
                Choose a project folder to install this asset.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Asset info */}
              <div className="flex items-center gap-2 text-sm">
                <AssetTypeBadge type={asset.type} />
                <span className="font-medium">{asset.name}</span>
                <span className="text-muted-foreground font-mono text-xs">
                  v{asset.currentVersion}
                </span>
                <span className="text-muted-foreground text-xs">
                  ({PLATFORM_LABELS[asset.primaryPlatform] ?? asset.primaryPlatform})
                </span>
              </div>

              {/* Directory picker */}
              <div className="space-y-2">
                <Label>Project Folder</Label>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 font-normal"
                  onClick={handlePickDirectory}
                >
                  <FolderOpen className="size-4 shrink-0" />
                  {projectName ? (
                    <span className="truncate font-mono text-sm">
                      {projectName}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      Choose project folder...
                    </span>
                  )}
                </Button>
              </div>

              {/* Subdirectory */}
              <div className="space-y-2">
                <Label htmlFor="install-subdir">Install Subdirectory</Label>
                <Input
                  id="install-subdir"
                  value={subdir}
                  onChange={(e) => setSubdir(e.target.value)}
                  placeholder=".claude/skills"
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Auto-suggested based on platform and asset type. You can
                  change this.
                </p>
              </div>

              {/* Target path preview */}
              {directoryHandle && (
                <div className="rounded-md bg-muted p-3 space-y-1">
                  <p className="text-xs text-muted-foreground">
                    File will be written to:
                  </p>
                  <p className="text-sm font-mono break-all">{targetPath}</p>
                </div>
              )}

              {/* Previous install hint */}
              {previousInstallPath && (
                <p className="text-xs text-muted-foreground">
                  Previously installed to:{" "}
                  <span className="font-mono">{previousInstallPath}</span>
                </p>
              )}

              {/* Bundle note */}
              {asset.storageType === "BUNDLE" && (
                <div className="rounded-md border border-yellow-500/25 bg-yellow-500/5 p-3 text-xs text-yellow-400">
                  This is a bundle asset. Only the primary file (
                  <span className="font-mono">{asset.primaryFileName}</span>)
                  will be installed. Use the Download button for the full bundle.
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleInstall}
                disabled={!directoryHandle || !asset.content}
                className="gap-1.5"
              >
                <Download className="size-3.5" />
                Install
              </Button>
            </DialogFooter>
          </>
        )}

        {/* ── Installing step ── */}
        {step === "installing" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Installing to{" "}
              <span className="font-mono">{targetPath}</span>...
            </p>
          </div>
        )}

        {/* ── Done step ── */}
        {step === "done" && (
          <>
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="rounded-full bg-green-500/15 p-3">
                <Check className="size-6 text-green-400" />
              </div>
              <div className="text-center space-y-1">
                <p className="font-medium">Installed successfully!</p>
                <p className="text-sm font-mono text-muted-foreground break-all">
                  {targetPath}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => {
                  onInstallComplete();
                  onOpenChange(false);
                  resetState();
                }}
              >
                Done
              </Button>
            </DialogFooter>
          </>
        )}

        {/* ── Error step ── */}
        {step === "error" && (
          <>
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="rounded-full bg-red-500/15 p-3">
                <AlertCircle className="size-6 text-red-400" />
              </div>
              <div className="text-center space-y-1">
                <p className="font-medium">Installation failed</p>
                <p className="text-sm text-muted-foreground">{errorMessage}</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={() => setStep("pick")}>Try Again</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
