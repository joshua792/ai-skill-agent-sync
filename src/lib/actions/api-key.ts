"use server";

import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { generateApiKey } from "@/lib/api-key";
import { createApiKeySchema, revokeApiKeySchema } from "@/lib/validations/api-key";

// ─── Rate Limiters ────────────────────────────────────

const createKeyLimiter = rateLimit({ interval: 5 * 60_000, limit: 5 });

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

// ─── Actions ──────────────────────────────────────────

export async function createApiKeyAction(formData: FormData) {
  const userId = await requireUser();

  const { success: allowed } = createKeyLimiter.check(userId);
  if (!allowed) {
    return { success: false as const, error: "Too many requests. Try again later." };
  }

  const raw = {
    name: formData.get("name") as string,
    machineId: (formData.get("machineId") as string) || undefined,
    expiresInDays: formData.get("expiresInDays")
      ? Number(formData.get("expiresInDays"))
      : undefined,
  };

  const parsed = createApiKeySchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message };
  }

  const { name, machineId, expiresInDays } = parsed.data;

  // If machineId provided, verify ownership
  if (machineId) {
    const machine = await db.userMachine.findFirst({
      where: { id: machineId, userId },
    });
    if (!machine) {
      return { success: false as const, error: "Machine not found" };
    }
  }

  const key = generateApiKey();

  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
    : null;

  await db.apiKey.create({
    data: {
      userId,
      machineId: machineId ?? null,
      name,
      hashedKey: key.hash,
      prefix: key.prefix,
      expiresAt,
    },
  });

  revalidatePath("/dashboard/api-keys");

  return { success: true as const, key: key.raw };
}

export async function revokeApiKeyAction(formData: FormData) {
  const userId = await requireUser();

  const raw = { keyId: formData.get("keyId") as string };
  const parsed = revokeApiKeySchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message };
  }

  const apiKey = await db.apiKey.findFirst({
    where: { id: parsed.data.keyId, userId },
  });

  if (!apiKey) {
    return { success: false as const, error: "API key not found" };
  }

  if (apiKey.revokedAt) {
    return { success: false as const, error: "API key already revoked" };
  }

  await db.apiKey.update({
    where: { id: apiKey.id },
    data: { revokedAt: new Date() },
  });

  revalidatePath("/dashboard/api-keys");

  return { success: true as const };
}

export async function listApiKeys() {
  const userId = await requireUser();

  const keys = await db.apiKey.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      prefix: true,
      machineId: true,
      machine: { select: { name: true } },
      lastUsedAt: true,
      expiresAt: true,
      revokedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return keys;
}
