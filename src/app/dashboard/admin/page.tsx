import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { ShieldCheck } from "lucide-react";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/admin";
import { formatDate } from "@/lib/format";
import { ASSET_TYPE_LABELS } from "@/lib/constants";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminStatsCards } from "@/components/admin/admin-stats-cards";
import { DownloadChart } from "@/components/analytics/download-chart";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Admin",
};

export default async function AdminOverviewPage() {
  const user = await currentUser();
  if (!user || !isAdmin(user.id)) redirect("/dashboard");

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Run all queries in parallel
  const [
    totalUsers,
    newUsers7d,
    totalAssets,
    newAssets7d,
    aggregates,
    downloads30d,
    typeDistribution,
    recentUsers,
    recentAssets,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    db.asset.count({ where: { deletedAt: null } }),
    db.asset.count({
      where: { createdAt: { gte: sevenDaysAgo }, deletedAt: null },
    }),
    db.asset.aggregate({
      where: { deletedAt: null },
      _sum: { downloadCount: true, forkCount: true },
    }),
    db.download.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    db.asset.groupBy({
      by: ["type"],
      where: { deletedAt: null },
      _count: true,
    }),
    db.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        username: true,
        displayName: true,
        email: true,
        createdAt: true,
      },
    }),
    db.asset.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        slug: true,
        name: true,
        type: true,
        createdAt: true,
        author: { select: { username: true } },
      },
    }),
  ]);

  // Build chart data (30 days)
  const downloadsByDate = new Map<string, number>();
  for (const d of downloads30d) {
    const key = d.createdAt.toISOString().split("T")[0];
    downloadsByDate.set(key, (downloadsByDate.get(key) ?? 0) + 1);
  }
  const chartData: { date: string; downloads: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const key = date.toISOString().split("T")[0];
    chartData.push({ date: key, downloads: downloadsByDate.get(key) ?? 0 });
  }

  const totalDownloads = aggregates._sum.downloadCount ?? 0;
  const totalForks = aggregates._sum.forkCount ?? 0;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <ShieldCheck className="h-6 w-6 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Admin</h1>
      </div>

      <AdminNav />

      <AdminStatsCards
        totalUsers={totalUsers}
        newUsers7d={newUsers7d}
        totalAssets={totalAssets}
        newAssets7d={newAssets7d}
        totalDownloads={totalDownloads}
        totalForks={totalForks}
      />

      <div className="grid gap-6 mt-8 lg:grid-cols-2">
        <DownloadChart data={chartData} />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Asset Type Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {typeDistribution.map((t) => (
                <div key={t.type} className="flex items-center justify-between">
                  <span className="text-sm">
                    {ASSET_TYPE_LABELS[t.type] ?? t.type}
                  </span>
                  <Badge variant="secondary">{t._count}</Badge>
                </div>
              ))}
              {typeDistribution.length === 0 && (
                <p className="text-sm text-muted-foreground">No assets yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 mt-8 lg:grid-cols-2">
        {/* Recent Users */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentUsers.map((u) => (
                <div
                  key={u.username}
                  className="flex items-center justify-between text-sm"
                >
                  <Link
                    href={`/profile/${u.username}`}
                    className="font-medium hover:underline"
                  >
                    {u.displayName ?? `@${u.username}`}
                  </Link>
                  <span className="text-muted-foreground">
                    {formatDate(u.createdAt)}
                  </span>
                </div>
              ))}
              {recentUsers.length === 0 && (
                <p className="text-sm text-muted-foreground">No users yet.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Assets */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Assets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentAssets.map((a) => (
                <div
                  key={a.slug}
                  className="flex items-center justify-between text-sm"
                >
                  <div>
                    <Link
                      href={`/assets/${a.slug}`}
                      className="font-medium hover:underline"
                    >
                      {a.name}
                    </Link>
                    <span className="text-muted-foreground ml-2">
                      by @{a.author.username}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {ASSET_TYPE_LABELS[a.type] ?? a.type}
                  </Badge>
                </div>
              ))}
              {recentAssets.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No assets yet.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
