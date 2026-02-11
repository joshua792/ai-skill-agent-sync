"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BundleFileTree } from "./bundle-file-tree";
import type { BundleManifest } from "@/lib/types/bundle";

interface AssetDetailContentProps {
  content: string | null;
  fileName: string;
  storageType?: string;
  bundleManifest?: BundleManifest | null;
}

export function AssetDetailContent({
  content,
  fileName,
  storageType,
  bundleManifest,
}: AssetDetailContentProps) {
  const [copied, setCopied] = useState(false);

  if (!content) return null;

  async function handleCopy() {
    await navigator.clipboard.writeText(content!);
    setCopied(true);
    toast.success("Content copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4">
      {storageType === "BUNDLE" && bundleManifest && (
        <BundleFileTree manifest={bundleManifest} primaryFileName={fileName} />
      )}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold">
          {storageType === "BUNDLE" ? `${fileName} (primary file)` : fileName}
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="gap-1.5"
        >
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <div className="rounded-lg border bg-muted/50 p-4 overflow-x-auto">
        <pre className="text-sm font-mono whitespace-pre-wrap">{content}</pre>
      </div>
    </div>
  );
}
