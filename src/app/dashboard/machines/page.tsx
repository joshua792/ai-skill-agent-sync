import type { Metadata } from "next";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Monitor } from "lucide-react";
import { db } from "@/lib/db";
import { MachinesList } from "@/components/machines/machines-list";

export const metadata: Metadata = {
  title: "Machines",
};

export default async function MachinesPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const machines = await db.userMachine.findMany({
    where: { userId: user.id },
    include: { _count: { select: { syncStates: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Monitor className="h-6 w-6 text-muted-foreground" />
        <h1 className="text-2xl font-bold">My Machines</h1>
      </div>
      <MachinesList machines={JSON.parse(JSON.stringify(machines))} />
    </div>
  );
}
