"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { requireAdmin } from "@/lib/admin";

const adminLimiter = rateLimit({ interval: 60_000, limit: 20 });

type ActionResult =
  | { success: true }
  | { success: false; error: string };

export async function adminDeleteUser(
  userId: string
): Promise<ActionResult> {
  const adminId = await requireAdmin();

  const { success: withinLimit } = adminLimiter.check(adminId);
  if (!withinLimit) {
    return { success: false, error: "Rate limit exceeded." };
  }

  if (userId === adminId) {
    return { success: false, error: "Cannot delete your own account." };
  }

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) {
    return { success: false, error: "User not found." };
  }

  await db.user.delete({ where: { id: userId } });

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/users");
  return { success: true };
}

export async function adminDeleteAsset(
  assetId: string
): Promise<ActionResult> {
  const adminId = await requireAdmin();

  const { success: withinLimit } = adminLimiter.check(adminId);
  if (!withinLimit) {
    return { success: false, error: "Rate limit exceeded." };
  }

  const asset = await db.asset.findUnique({ where: { id: assetId } });
  if (!asset) {
    return { success: false, error: "Asset not found." };
  }

  if (asset.deletedAt) {
    return { success: false, error: "Asset is already deleted." };
  }

  await db.asset.update({
    where: { id: assetId },
    data: { deletedAt: new Date() },
  });

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/assets");
  revalidatePath(`/assets/${asset.slug}`);
  return { success: true };
}

export async function adminRestoreAsset(
  assetId: string
): Promise<ActionResult> {
  const adminId = await requireAdmin();

  const { success: withinLimit } = adminLimiter.check(adminId);
  if (!withinLimit) {
    return { success: false, error: "Rate limit exceeded." };
  }

  const asset = await db.asset.findUnique({ where: { id: assetId } });
  if (!asset) {
    return { success: false, error: "Asset not found." };
  }

  if (!asset.deletedAt) {
    return { success: false, error: "Asset is not deleted." };
  }

  await db.asset.update({
    where: { id: assetId },
    data: { deletedAt: null },
  });

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/assets");
  revalidatePath(`/assets/${asset.slug}`);
  return { success: true };
}
