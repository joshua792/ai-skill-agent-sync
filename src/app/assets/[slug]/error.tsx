"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AssetError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="container mx-auto px-4 py-24 text-center">
      <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>
      <p className="text-muted-foreground mb-6">
        {error.message || "Failed to load this asset."}
      </p>
      <div className="flex justify-center gap-4">
        <Button onClick={reset}>Try again</Button>
        <Link href="/explore">
          <Button variant="outline">Browse Assets</Button>
        </Link>
      </div>
    </div>
  );
}
