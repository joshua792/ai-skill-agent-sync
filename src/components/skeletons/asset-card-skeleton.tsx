import { Card, CardHeader, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function AssetCardSkeleton() {
  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <Skeleton className="h-5 w-3/4 mt-2" />
        <Skeleton className="h-4 w-full mt-1" />
        <Skeleton className="h-4 w-2/3 mt-1" />
      </CardHeader>
      <CardFooter className="justify-between">
        <div className="flex gap-3">
          <Skeleton className="h-3 w-8" />
          <Skeleton className="h-3 w-8" />
        </div>
        <Skeleton className="h-3 w-16" />
      </CardFooter>
    </Card>
  );
}
