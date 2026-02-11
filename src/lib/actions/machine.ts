"use server";

import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  registerMachineSchema,
  syncAssetSchema,
} from "@/lib/validations/machine";

// ─── Helpers ───────────────────────────────────────────

async function requireUser() {
  const user = await currentUser();
  if (!user) throw new Error("Unauthorized");

  await db.user.upsert({
    where: { id: user.id },
    create: {
      id: user.id,
      username: user.username ?? user.id,
      displayName:
        [user.firstName, user.lastName].filter(Boolean).join(" ") || null,
      avatarUrl: user.imageUrl,
      email: user.emailAddresses?.[0]?.emailAddress ?? "",
    },
    update: {},
  });

  return user.id;
}

type ActionResult = { success: true } | { success: false; error: string };

// ─── registerMachine ──────────────────────────────────

export async function registerMachine(
  formData: FormData
): Promise<ActionResult> {
  const userId = await requireUser();

  const raw = {
    name: formData.get("name"),
    machineIdentifier: formData.get("machineIdentifier"),
  };

  const parsed = registerMachineSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  try {
    await db.userMachine.create({
      data: {
        userId,
        name: parsed.data.name,
        machineIdentifier: parsed.data.machineIdentifier,
      },
    });
  } catch (err: unknown) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      err.code === "P2002"
    ) {
      return {
        success: false,
        error: "A machine with this identifier already exists",
      };
    }
    throw err;
  }

  revalidatePath("/dashboard/machines");
  return { success: true };
}

// ─── deleteMachine ────────────────────────────────────

export async function deleteMachine(
  machineId: string
): Promise<ActionResult> {
  const userId = await requireUser();

  const machine = await db.userMachine.findUnique({
    where: { id: machineId },
  });
  if (!machine || machine.userId !== userId) {
    return { success: false, error: "Machine not found or not authorized" };
  }

  await db.userMachine.delete({ where: { id: machineId } });

  revalidatePath("/dashboard/machines");
  return { success: true };
}

// ─── syncAssetToMachine ───────────────────────────────

export async function syncAssetToMachine(
  formData: FormData
): Promise<ActionResult> {
  const userId = await requireUser();

  const raw = {
    machineId: formData.get("machineId"),
    assetId: formData.get("assetId"),
  };

  const parsed = syncAssetSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const machine = await db.userMachine.findUnique({
    where: { id: parsed.data.machineId },
  });
  if (!machine || machine.userId !== userId) {
    return { success: false, error: "Machine not found or not authorized" };
  }

  const asset = await db.asset.findUnique({
    where: { id: parsed.data.assetId },
  });
  if (!asset || asset.deletedAt || asset.authorId !== userId) {
    return { success: false, error: "Asset not found or not authorized" };
  }

  const now = new Date();

  await db.$transaction([
    db.machineSyncState.upsert({
      where: {
        machineId_assetId: {
          machineId: machine.id,
          assetId: asset.id,
        },
      },
      create: {
        machineId: machine.id,
        assetId: asset.id,
        syncedVersion: asset.currentVersion,
        syncedAt: now,
      },
      update: {
        syncedVersion: asset.currentVersion,
        syncedAt: now,
      },
    }),
    db.userMachine.update({
      where: { id: machine.id },
      data: { lastSyncAt: now },
    }),
    db.download.create({
      data: {
        assetId: asset.id,
        userId,
        version: asset.currentVersion,
      },
    }),
    db.asset.update({
      where: { id: asset.id },
      data: { downloadCount: { increment: 1 } },
    }),
  ]);

  revalidatePath(`/dashboard/machines/${machine.id}`);
  revalidatePath(`/assets/${asset.slug}`);
  return { success: true };
}

// ─── markAssetSynced ──────────────────────────────────

export async function markAssetSynced(
  machineId: string,
  assetId: string
): Promise<ActionResult> {
  const userId = await requireUser();

  const machine = await db.userMachine.findUnique({
    where: { id: machineId },
  });
  if (!machine || machine.userId !== userId) {
    return { success: false, error: "Machine not found or not authorized" };
  }

  const asset = await db.asset.findUnique({ where: { id: assetId } });
  if (!asset || asset.deletedAt || asset.authorId !== userId) {
    return { success: false, error: "Asset not found or not authorized" };
  }

  const now = new Date();

  await db.$transaction([
    db.machineSyncState.upsert({
      where: {
        machineId_assetId: {
          machineId: machine.id,
          assetId: asset.id,
        },
      },
      create: {
        machineId: machine.id,
        assetId: asset.id,
        syncedVersion: asset.currentVersion,
        syncedAt: now,
      },
      update: {
        syncedVersion: asset.currentVersion,
        syncedAt: now,
      },
    }),
    db.userMachine.update({
      where: { id: machine.id },
      data: { lastSyncAt: now },
    }),
  ]);

  revalidatePath(`/dashboard/machines/${machine.id}`);
  return { success: true };
}
