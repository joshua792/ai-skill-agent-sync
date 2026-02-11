import { Skeleton } from "@/components/ui/skeleton";
import { AssetCardSkeleton } from "@/components/skeletons/asset-card-skeleton";

export default function ProfileLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Profile Header */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-8">
        <Skeleton className="size-20 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-64 mt-2" />
          <div className="flex items-center gap-4 mt-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </div>

      <Skeleton className="h-px w-full mb-8" />

      <Skeleton className="h-6 w-32 mb-4" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <AssetCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
