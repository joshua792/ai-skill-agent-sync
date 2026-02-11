import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { Pencil } from "lucide-react";
import { db } from "@/lib/db";
import { updateAsset } from "@/lib/actions/asset";
import { AssetForm } from "@/components/assets/asset-form";

export const metadata: Metadata = {
  title: "Edit Asset",
};

export default async function EditAssetPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const asset = await db.asset.findUnique({
    where: { slug },
  });

  if (!asset || asset.deletedAt) notFound();
  if (asset.authorId !== user.id) redirect("/dashboard");

  const assetId = asset.id;

  async function handleUpdate(formData: FormData) {
    "use server";
    await updateAsset(assetId, formData);
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Pencil className="h-6 w-6 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Edit: {asset.name}</h1>
      </div>
      <AssetForm
        action={handleUpdate}
        submitLabel="Save Changes"
        defaultValues={{
          name: asset.name,
          description: asset.description,
          type: asset.type,
          primaryPlatform: asset.primaryPlatform,
          compatiblePlatforms: asset.compatiblePlatforms,
          category: asset.category,
          tags: asset.tags,
          visibility: asset.visibility,
          license: asset.license,
          installScope: asset.installScope,
          content: asset.content ?? "",
          primaryFileName: asset.primaryFileName,
          storageType: asset.storageType,
          bundleUrl: asset.bundleUrl ?? undefined,
          bundleManifest: (asset.bundleManifest as unknown as import("@/lib/types/bundle").BundleManifest) ?? undefined,
        }}
      />
    </div>
  );
}
