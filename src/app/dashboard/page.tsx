import type { Metadata } from "next";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { LayoutDashboard } from "lucide-react";
import { db } from "@/lib/db";
import { DashboardAssetGrid } from "@/components/assets/dashboard-asset-grid";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const assets = await db.asset.findMany({
    where: { authorId: user.id, deletedAt: null },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <LayoutDashboard className="h-6 w-6 text-muted-foreground" />
        <h1 className="text-2xl font-bold">My Assets</h1>
      </div>
      <DashboardAssetGrid assets={JSON.parse(JSON.stringify(assets))} />
    </div>
  );
}
