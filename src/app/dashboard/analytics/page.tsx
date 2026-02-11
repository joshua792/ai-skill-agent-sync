import type { Metadata } from "next";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { BarChart3 } from "lucide-react";
import { db } from "@/lib/db";
import { DownloadChart } from "@/components/analytics/download-chart";
import { TopAssetsTable } from "@/components/analytics/top-assets-table";
import { StatsCards } from "@/components/analytics/stats-cards";

export const metadata: Metadata = {
  title: "Analytics",
};

export default async function AnalyticsPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const assets = await db.asset.findMany({
    where: { authorId: user.id, deletedAt: null },
    select: {
      id: true,
      name: true,
      slug: true,
      downloadCount: true,
      forkCount: true,
    },
    orderBy: { downloadCount: "desc" },
  });

  const assetIds = assets.map((a) => a.id);

  // Download trends: last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const downloads =
    assetIds.length > 0
      ? await db.download.findMany({
          where: {
            assetId: { in: assetIds },
            createdAt: { gte: thirtyDaysAgo },
          },
          select: { createdAt: true },
          orderBy: { createdAt: "asc" },
        })
      : [];

  // Aggregate downloads by date
  const downloadsByDate = new Map<string, number>();
  for (const d of downloads) {
    const dateKey = d.createdAt.toISOString().split("T")[0];
    downloadsByDate.set(dateKey, (downloadsByDate.get(dateKey) ?? 0) + 1);
  }

  // Fill in all 30 days
  const chartData: { date: string; downloads: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const key = date.toISOString().split("T")[0];
    chartData.push({ date: key, downloads: downloadsByDate.get(key) ?? 0 });
  }

  const totalDownloads = assets.reduce((sum, a) => sum + a.downloadCount, 0);
  const totalForks = assets.reduce((sum, a) => sum + a.forkCount, 0);

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <BarChart3 className="h-6 w-6 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Analytics</h1>
      </div>

      <StatsCards
        totalAssets={assets.length}
        totalDownloads={totalDownloads}
        totalForks={totalForks}
        recentDownloads={downloads.length}
      />

      <div className="grid gap-6 mt-8 lg:grid-cols-2">
        <DownloadChart data={chartData} />
        <TopAssetsTable assets={assets.slice(0, 10)} />
      </div>
    </div>
  );
}
