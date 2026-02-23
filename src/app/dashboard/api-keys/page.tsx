import type { Metadata } from "next";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { KeyRound } from "lucide-react";
import { listApiKeys } from "@/lib/actions/api-key";
import { db } from "@/lib/db";
import { ApiKeyManager } from "@/components/api-keys/api-key-manager";

export const metadata: Metadata = {
  title: "API Keys",
};

export default async function ApiKeysPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const keys = await listApiKeys();

  const machines = await db.userMachine.findMany({
    where: { userId: user.id },
    select: { id: true, name: true, machineIdentifier: true },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <KeyRound className="h-6 w-6 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-bold">API Keys</h1>
          <p className="text-sm text-muted-foreground">
            Generate keys to authenticate the AssetVault CLI for machine sync.
          </p>
        </div>
      </div>
      <ApiKeyManager
        keys={JSON.parse(JSON.stringify(keys))}
        machines={JSON.parse(JSON.stringify(machines))}
      />
    </div>
  );
}
