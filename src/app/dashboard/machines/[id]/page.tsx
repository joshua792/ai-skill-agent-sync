import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { Monitor, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { MachineSyncView } from "@/components/machines/machine-sync-view";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const machine = await db.userMachine.findUnique({
    where: { id },
    select: { name: true },
  });
  if (!machine) return { title: "Machine Not Found" };
  return { title: `${machine.name} — Sync` };
}

export default async function MachineSyncPage({ params }: Props) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const machine = await db.userMachine.findUnique({
    where: { id },
    include: {
      syncStates: true,
    },
  });

  if (!machine || machine.userId !== user.id) notFound();

  const assets = await db.asset.findMany({
    where: { authorId: user.id, deletedAt: null },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard/machines">
          <Button variant="ghost" size="sm" className="gap-1.5">
            <ArrowLeft className="size-4" />
            Back
          </Button>
        </Link>
        <Monitor className="size-6 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-bold">{machine.name}</h1>
          <p className="text-sm text-muted-foreground font-mono">
            {machine.machineIdentifier}
          </p>
        </div>
      </div>
      <MachineSyncView
        machine={JSON.parse(JSON.stringify(machine))}
        assets={JSON.parse(JSON.stringify(assets))}
      />
    </div>
  );
}
