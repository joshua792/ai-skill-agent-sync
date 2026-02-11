import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { createAsset } from "@/lib/actions/asset";
import { AssetForm } from "@/components/assets/asset-form";

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
      <AssetForm action={createAsset} />
    </div>
  );
}
