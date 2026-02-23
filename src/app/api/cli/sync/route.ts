import { NextResponse } from "next/server";
import { requireApiKeyAuth } from "@/lib/cli-auth";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { cliSyncReportSchema } from "@/lib/validations/cli";

const limiter = rateLimit({ interval: 60_000, limit: 120 });

export async function POST(request: Request) {
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

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = cliSyncReportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { machineId, assetId, syncedVersion, localHash, installPath, direction } =
    parsed.data;

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

  // Verify asset belongs to user
  const asset = await db.asset.findFirst({
    where: { id: assetId, authorId: auth.userId, deletedAt: null },
  });

  if (!asset) {
    return NextResponse.json(
      { error: "Asset not found" },
      { status: 404 }
    );
  }

  const now = new Date();

  await db.$transaction([
    db.machineSyncState.upsert({
      where: {
        machineId_assetId: { machineId, assetId },
      },
      create: {
        machineId,
        assetId,
        syncedVersion,
        localHash: localHash ?? null,
        installPath: installPath ?? null,
        lastPushAt: direction === "push" ? now : null,
        lastPullAt: direction === "pull" ? now : null,
      },
      update: {
        syncedVersion,
        localHash: localHash ?? undefined,
        installPath: installPath ?? undefined,
        ...(direction === "push" ? { lastPushAt: now } : { lastPullAt: now }),
        syncedAt: now,
      },
    }),
    db.userMachine.update({
      where: { id: machineId },
      data: { lastSyncAt: now },
    }),
  ]);

  return NextResponse.json({ success: true });
}
