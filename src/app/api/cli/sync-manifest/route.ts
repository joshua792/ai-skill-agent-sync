import { NextResponse } from "next/server";
import { requireApiKeyAuth } from "@/lib/cli-auth";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { syncManifestQuerySchema } from "@/lib/validations/cli";

const limiter = rateLimit({ interval: 60_000, limit: 120 });

export async function GET(request: Request) {
  let auth;
  try {
    auth = await requireApiKeyAuth(request);
  } catch (res) {
    return res as Response;
  }

  const { success } = limiter.check(auth.keyId);
  if (!success) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429 }
    );
  }

  const url = new URL(request.url);
  const parsed = syncManifestQuerySchema.safeParse({
    machineId: url.searchParams.get("machineId") ?? "",
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { machineId } = parsed.data;

  // Verify machine belongs to user
  const machine = await db.userMachine.findFirst({
    where: { id: machineId, userId: auth.userId },
  });

  if (!machine) {
    return NextResponse.json(
      { error: "Machine not found or not authorized" },
      { status: 404 }
    );
  }

  // Get all user's non-deleted assets with sync states for this machine
  const assets = await db.asset.findMany({
    where: { authorId: auth.userId, deletedAt: null },
    select: {
      id: true,
      slug: true,
      name: true,
      type: true,
      primaryPlatform: true,
      currentVersion: true,
      storageType: true,
      primaryFileName: true,
      installScope: true,
      updatedAt: true,
      syncStates: {
        where: { machineId },
        select: {
          syncedVersion: true,
          localHash: true,
          installPath: true,
          lastPushAt: true,
          lastPullAt: true,
          syncedAt: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  // Flatten sync state (each asset has at most 1 sync state per machine)
  const manifest = assets.map((asset) => ({
    ...asset,
    syncState: asset.syncStates[0] ?? null,
    syncStates: undefined,
  }));

  return NextResponse.json({ machine, assets: manifest });
}
