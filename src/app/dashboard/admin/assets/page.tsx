import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { ShieldCheck } from "lucide-react";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/admin";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminAssetsTable } from "@/components/admin/admin-assets-table";

export const metadata: Metadata = {
  title: "Admin — Assets",
};

export default async function AdminAssetsPage() {
  const user = await currentUser();
  if (!user || !isAdmin(user.id)) redirect("/dashboard");

  const assets = await db.asset.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      slug: true,
      name: true,
      type: true,
      primaryPlatform: true,
      visibility: true,
      downloadCount: true,
      forkCount: true,
      createdAt: true,
      deletedAt: true,
      author: { select: { username: true, displayName: true } },
    },
  });

  const serialized = assets.map((a) => ({
    id: a.id,
    slug: a.slug,
    name: a.name,
    type: a.type,
    primaryPlatform: a.primaryPlatform,
    visibility: a.visibility,
    downloadCount: a.downloadCount,
    forkCount: a.forkCount,
    createdAt: a.createdAt.toISOString(),
    deletedAt: a.deletedAt?.toISOString() ?? null,
    authorUsername: a.author.username,
    authorDisplayName: a.author.displayName,
  }));

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <ShieldCheck className="h-6 w-6 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Admin</h1>
      </div>

      <AdminNav />

      <AdminAssetsTable assets={serialized} />
    </div>
  );
}
