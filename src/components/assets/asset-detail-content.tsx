"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AssetDetailContentProps {
  content: string | null;
  fileName: string;
}

export function AssetDetailContent({
  content,
  fileName,
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
    <div>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold">{fileName}</h2>
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
