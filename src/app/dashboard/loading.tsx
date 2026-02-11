import { Skeleton } from "@/components/ui/skeleton";
import { AssetCardSkeleton } from "@/components/skeletons/asset-card-skeleton";

export default function DashboardLoading() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Skeleton className="h-6 w-6 rounded" />
        <Skeleton className="h-7 w-32" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <AssetCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
