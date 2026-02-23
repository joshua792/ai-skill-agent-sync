import { NextResponse } from "next/server";
import { requireApiKeyAuth } from "@/lib/cli-auth";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { assetContentPutSchema } from "@/lib/validations/cli";
import { bumpPatchVersion } from "@/lib/version";

const getLimiter = rateLimit({ interval: 60_000, limit: 60 });
const putLimiter = rateLimit({ interval: 60_000, limit: 30 });

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let auth;
  try {
    auth = await requireApiKeyAuth(request);
  } catch (res) {
    return res as Response;
  }

  const { success } = getLimiter.check(auth.keyId);
  if (!success) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429 }
    );
  }

  const { id } = await params;

  const asset = await db.asset.findFirst({
    where: { id, authorId: auth.userId, deletedAt: null },
    select: {
      id: true,
      slug: true,
      name: true,
      content: true,
      bundleUrl: true,
      storageType: true,
      currentVersion: true,
      primaryFileName: true,
      updatedAt: true,
    },
  });

  if (!asset) {
    return NextResponse.json(
      { error: "Asset not found" },
      { status: 404 }
    );
  }

  if (asset.storageType === "BUNDLE") {
    return NextResponse.json({
      type: "BUNDLE",
      bundleUrl: asset.bundleUrl,
      version: asset.currentVersion,
      primaryFileName: asset.primaryFileName,
      updatedAt: asset.updatedAt,
    });
  }

  return NextResponse.json({
    type: "INLINE",
    content: asset.content,
    version: asset.currentVersion,
    primaryFileName: asset.primaryFileName,
    updatedAt: asset.updatedAt,
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let auth;
  try {
    auth = await requireApiKeyAuth(request);
  } catch (res) {
    return res as Response;
  }

  const { success } = putLimiter.check(auth.keyId);
  if (!success) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429 }
    );
  }

  const { id } = await params;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = assetContentPutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { content, localHash, machineId } = parsed.data;

  const asset = await db.asset.findFirst({
    where: { id, authorId: auth.userId, deletedAt: null },
    select: {
      id: true,
      content: true,
      currentVersion: true,
      storageType: true,
      bundleUrl: true,
    },
  });

  if (!asset) {
    return NextResponse.json(
      { error: "Asset not found" },
      { status: 404 }
    );
  }

  if (asset.storageType === "BUNDLE") {
    return NextResponse.json(
      { error: "Cannot push content to BUNDLE assets via CLI" },
      { status: 400 }
    );
  }

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

  const newVersion = bumpPatchVersion(asset.currentVersion);

  // Transaction: snapshot → update asset → update sync state
  await db.$transaction([
    // Snapshot current content as a version
    db.assetVersion.create({
      data: {
        assetId: asset.id,
        version: asset.currentVersion,
        changelog: `Auto-synced from CLI (v${asset.currentVersion} → v${newVersion})`,
        content: asset.content,
        bundleUrl: asset.bundleUrl,
      },
    }),
    // Update asset with new content and version
    db.asset.update({
      where: { id: asset.id },
      data: { content, currentVersion: newVersion },
    }),
    // Upsert sync state for this machine
    db.machineSyncState.upsert({
      where: {
        machineId_assetId: { machineId, assetId: asset.id },
      },
      create: {
        machineId,
        assetId: asset.id,
        syncedVersion: newVersion,
        localHash,
        lastPushAt: new Date(),
      },
      update: {
        syncedVersion: newVersion,
        localHash,
        lastPushAt: new Date(),
        syncedAt: new Date(),
      },
    }),
    // Update machine lastSyncAt
    db.userMachine.update({
      where: { id: machineId },
      data: { lastSyncAt: new Date() },
    }),
  ]);

  return NextResponse.json({ version: newVersion });
}
