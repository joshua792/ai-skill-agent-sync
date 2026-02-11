import { Skeleton } from "@/components/ui/skeleton";
import { AssetCardSkeleton } from "@/components/skeletons/asset-card-skeleton";

export default function ExploreLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Skeleton className="h-6 w-6 rounded" />
        <Skeleton className="h-7 w-40" />
      </div>

      {/* Filter bar skeleton */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-full sm:w-[150px]" />
        <Skeleton className="h-10 w-full sm:w-[160px]" />
        <Skeleton className="h-10 w-full sm:w-[180px]" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <AssetCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
