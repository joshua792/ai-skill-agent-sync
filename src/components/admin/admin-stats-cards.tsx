import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Users,
  UserPlus,
  Package,
  PackagePlus,
  Download,
  GitFork,
} from "lucide-react";

interface AdminStatsCardsProps {
  totalUsers: number;
  newUsers7d: number;
  totalAssets: number;
  newAssets7d: number;
  totalDownloads: number;
  totalForks: number;
}

export function AdminStatsCards({
  totalUsers,
  newUsers7d,
  totalAssets,
  newAssets7d,
  totalDownloads,
  totalForks,
}: AdminStatsCardsProps) {
  const stats = [
    { label: "Total Users", value: totalUsers, icon: Users },
    { label: "New Users (7d)", value: newUsers7d, icon: UserPlus },
    { label: "Total Assets", value: totalAssets, icon: Package },
    { label: "New Assets (7d)", value: newAssets7d, icon: PackagePlus },
    { label: "Total Downloads", value: totalDownloads, icon: Download },
    { label: "Total Forks", value: totalForks, icon: GitFork },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
