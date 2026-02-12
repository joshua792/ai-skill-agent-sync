import { Skeleton } from "@/components/ui/skeleton";

export default function AdminAssetsLoading() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Skeleton className="h-6 w-6 rounded" />
        <Skeleton className="h-7 w-24" />
      </div>

      <div className="flex gap-1 border-b mb-6">
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-9 w-16" />
        <Skeleton className="h-9 w-16" />
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-[130px]" />
        <Skeleton className="h-10 w-[130px]" />
        <Skeleton className="h-10 w-[130px]" />
      </div>

      <div className="rounded-md border">
        <div className="p-4 space-y-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-24 hidden sm:block" />
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-4 w-12 ml-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
