import type { Metadata } from "next";
import { Search } from "lucide-react";

export const metadata: Metadata = {
  title: "Explore",
};

export default function ExplorePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Search className="h-6 w-6 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Explore Assets</h1>
      </div>
      <div className="rounded-lg border border-dashed p-12 text-center">
        <p className="text-muted-foreground">
          Public asset discovery coming soon. Browse Skills, Commands, and Agents
          shared by the community.
        </p>
      </div>
    </div>
  );
}
