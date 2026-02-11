import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AssetNotFound() {
  return (
    <div className="container mx-auto px-4 py-24 text-center">
      <h1 className="text-4xl font-bold mb-4">Asset Not Found</h1>
      <p className="text-muted-foreground mb-8">
        This asset may have been deleted or doesn&apos;t exist.
      </p>
      <Link href="/explore">
        <Button>Browse Assets</Button>
      </Link>
    </div>
  );
}
