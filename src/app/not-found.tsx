import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container mx-auto px-4 py-24 text-center">
      <h1 className="text-6xl font-bold mb-4">404</h1>
      <p className="text-xl text-muted-foreground mb-8">Page not found</p>
      <div className="flex justify-center gap-4">
        <Link href="/">
          <Button>Go Home</Button>
        </Link>
        <Link href="/explore">
          <Button variant="outline">Explore Assets</Button>
        </Link>
      </div>
    </div>
  );
}
