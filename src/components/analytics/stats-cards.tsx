import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Package, Download, GitFork, TrendingUp } from "lucide-react";

interface StatsCardsProps {
  totalAssets: number;
  totalDownloads: number;
  totalForks: number;
  recentDownloads: number;
}

export function StatsCards({
  totalAssets,
  totalDownloads,
  totalForks,
  recentDownloads,
}: StatsCardsProps) {
  const stats = [
    { label: "Total Assets", value: totalAssets, icon: Package },
    { label: "Total Downloads", value: totalDownloads, icon: Download },
    { label: "Total Forks", value: totalForks, icon: GitFork },
    { label: "Downloads (30d)", value: recentDownloads, icon: TrendingUp },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((s) => (
        <Card key={s.label}>
          <CardHeader>
            <CardDescription className="flex items-center gap-1.5">
              <s.icon className="size-3.5" />
              {s.label}
            </CardDescription>
            <CardTitle className="text-2xl">
              {s.value.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}
