"use server";

import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { shareAssetSchema, revokeShareSchema } from "@/lib/validations/share";
import { sendShareNotification } from "@/lib/email";

// ─── Rate Limiters ────────────────────────────────────

const shareLimiter = rateLimit({ interval: 5 * 60_000, limit: 10 });

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

  return {
    userId: user.id,
    email: user.emailAddresses?.[0]?.emailAddress ?? "",
    displayName:
      [user.firstName, user.lastName].filter(Boolean).join(" ") ||
      user.username ||
      "Someone",
  };
}

type ActionResult = { success: true } | { success: false; error: string };

// ─── shareAsset ──────────────────────────────────────

export async function shareAsset(formData: FormData): Promise<ActionResult> {
  const { userId, email: userEmail, displayName } = await requireUser();

  const rl = shareLimiter.check(userId);
  if (!rl.success) {
    return { success: false, error: "Too many share requests. Please wait." };
  }

  const raw = {
    assetId: formData.get("assetId"),
    email: formData.get("email"),
  };

  const parsed = shareAssetSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const { assetId, email } = parsed.data;

  // Verify asset exists, not deleted, and user is the owner
  const asset = await db.asset.findUnique({ where: { id: assetId } });
  if (!asset || asset.deletedAt || asset.authorId !== userId) {
    return { success: false, error: "Asset not found or not authorized" };
  }

  // Only SHARED visibility assets support email sharing
  if (asset.visibility !== "SHARED") {
    return {
      success: false,
      error: "Only assets with Shared visibility can be shared by email",
    };
  }

  // Prevent sharing with yourself
  if (email === userEmail.toLowerCase()) {
    return { success: false, error: "You cannot share an asset with yourself" };
  }

  // Check for duplicate
  const existing = await db.assetShare.findUnique({
    where: { assetId_email: { assetId, email } },
  });
  if (existing) {
    return {
      success: false,
      error: "This asset has already been shared with that email",
    };
  }

  // Create share record
  const share = await db.assetShare.create({
    data: {
      assetId,
      email,
      sharedBy: userId,
    },
  });

  // Send email notification (fire-and-forget)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const assetUrl = `${appUrl}/assets/${asset.slug}?token=${share.token}`;

  sendShareNotification({
    to: email,
    assetName: asset.name,
    assetUrl,
    sharerName: displayName,
  }).catch(() => {
    // Silently ignore email failures — the share record is still created
  });

  revalidatePath(`/assets/${asset.slug}`);
  return { success: true };
}

// ─── revokeShare ─────────────────────────────────────

export async function revokeShare(shareId: string): Promise<ActionResult> {
  const { userId } = await requireUser();

  const parsed = revokeShareSchema.safeParse({ shareId });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const share = await db.assetShare.findUnique({
    where: { id: shareId },
    include: { asset: { select: { authorId: true, slug: true } } },
  });

  if (!share || share.asset.authorId !== userId) {
    return { success: false, error: "Share not found or not authorized" };
  }

  await db.assetShare.delete({ where: { id: shareId } });

  revalidatePath(`/assets/${share.asset.slug}`);
  return { success: true };
}

// ─── getAssetShares ──────────────────────────────────

export async function getAssetShares(
  assetId: string
): Promise<{ id: string; email: string; createdAt: string }[]> {
  const { userId } = await requireUser();

  const asset = await db.asset.findUnique({ where: { id: assetId } });
  if (!asset || asset.authorId !== userId) {
    return [];
  }

  const shares = await db.assetShare.findMany({
    where: { assetId },
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, createdAt: true },
  });

  return shares.map((s) => ({
    id: s.id,
    email: s.email,
    createdAt: s.createdAt.toISOString(),
  }));
}
