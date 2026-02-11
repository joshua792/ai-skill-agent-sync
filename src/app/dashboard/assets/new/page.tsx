import type { Metadata } from "next";
import { Plus } from "lucide-react";

export const metadata: Metadata = {
  title: "Create Asset",
};

export default function NewAssetPage() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Plus className="h-6 w-6 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Create New Asset</h1>
      </div>
      <div className="rounded-lg border border-dashed p-12 text-center">
        <p className="text-muted-foreground">
          Asset creation form coming in Phase 2.
        </p>
      </div>
    </div>
  );
}
