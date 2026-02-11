import type { Metadata } from "next";
import { Monitor } from "lucide-react";

export const metadata: Metadata = {
  title: "Machines",
};

export default function MachinesPage() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Monitor className="h-6 w-6 text-muted-foreground" />
        <h1 className="text-2xl font-bold">My Machines</h1>
      </div>
      <div className="rounded-lg border border-dashed p-12 text-center">
        <p className="text-muted-foreground">
          Register your machines to track asset sync status across devices.
        </p>
      </div>
    </div>
  );
}
