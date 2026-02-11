"use server";

import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import slugify from "slugify";
import { db } from "@/lib/db";
import {
  createAssetSchema,
  updateAssetSchema,
  publishVersionSchema,
} from "@/lib/validations/asset";

// ─── Helpers ───────────────────────────────────────────

async function requireUser() {
  const user = await currentUser();
  if (!user) throw new Error("Unauthorized");

  // Ensure user record exists in DB (webhook may not have fired yet)
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

async function generateUniqueSlug(name: string): Promise<string> {
  const base = slugify(name, { lower: true, strict: true });
  let slug = base;
  let counter = 0;
  while (await db.asset.findUnique({ where: { slug } })) {
    counter++;
    slug = `${base}-${counter}`;
  }
  return slug;
}

type ActionResult = { success: true } | { success: false; error: string };

// ─── createAsset ───────────────────────────────────────

export async function createAsset(formData: FormData): Promise<never> {
  const userId = await requireUser();

  const raw = {
    name: formData.get("name"),
    description: formData.get("description"),
    type: formData.get("type"),
    primaryPlatform: formData.get("primaryPlatform"),
    compatiblePlatforms: formData.getAll("compatiblePlatforms"),
    category: formData.get("category"),
    tags: formData.get("tags") ?? "",
    visibility: formData.get("visibility"),
    license: formData.get("license"),
    installScope: formData.get("installScope"),
    content: formData.get("content"),
    primaryFileName: formData.get("primaryFileName"),
  };

  const parsed = createAssetSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues.map((i) => i.message).join(", ")
    );
  }

  const data = parsed.data;
  const slug = await generateUniqueSlug(data.name);

  await db.asset.create({
    data: {
      slug,
      name: data.name,
      description: data.description,
      type: data.type,
      primaryPlatform: data.primaryPlatform,
      compatiblePlatforms: data.compatiblePlatforms,
      category: data.category,
      tags: data.tags,
      visibility: data.visibility,
      license: data.license,
      installScope: data.installScope,
      content: data.content,
      primaryFileName: data.primaryFileName,
      authorId: userId,
    },
  });

  revalidatePath("/dashboard");
  redirect(`/assets/${slug}`);
}

// ─── updateAsset ───────────────────────────────────────

export async function updateAsset(
  assetId: string,
  formData: FormData
): Promise<ActionResult> {
  const userId = await requireUser();

  const asset = await db.asset.findUnique({ where: { id: assetId } });
  if (!asset || asset.authorId !== userId) {
    return { success: false, error: "Asset not found or not authorized" };
  }
  if (asset.deletedAt) {
    return { success: false, error: "Cannot update a deleted asset" };
  }

  const raw = {
    name: formData.get("name") || undefined,
    description: formData.get("description") || undefined,
    type: formData.get("type") || undefined,
    primaryPlatform: formData.get("primaryPlatform") || undefined,
    compatiblePlatforms:
      formData.getAll("compatiblePlatforms").length > 0
        ? formData.getAll("compatiblePlatforms")
        : undefined,
    category: formData.get("category") || undefined,
    tags: formData.get("tags") || undefined,
    visibility: formData.get("visibility") || undefined,
    license: formData.get("license") || undefined,
    installScope: formData.get("installScope") || undefined,
    content: formData.get("content") || undefined,
    primaryFileName: formData.get("primaryFileName") || undefined,
  };

  const parsed = updateAssetSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.name && parsed.data.name !== asset.name) {
    updateData.slug = await generateUniqueSlug(parsed.data.name);
  }

  const updated = await db.asset.update({
    where: { id: assetId },
    data: updateData,
  });

  revalidatePath("/dashboard");
  revalidatePath(`/assets/${asset.slug}`);

  if (updateData.slug && updateData.slug !== asset.slug) {
    redirect(`/assets/${updateData.slug}`);
  }

  revalidatePath(`/assets/${updated.slug}`);
  return { success: true };
}

// ─── deleteAsset ───────────────────────────────────────

export async function deleteAsset(assetId: string): Promise<ActionResult> {
  const userId = await requireUser();

  const asset = await db.asset.findUnique({ where: { id: assetId } });
  if (!asset || asset.authorId !== userId) {
    return { success: false, error: "Asset not found or not authorized" };
  }

  await db.asset.update({
    where: { id: assetId },
    data: { deletedAt: new Date() },
  });

  revalidatePath("/dashboard");
  revalidatePath(`/assets/${asset.slug}`);
  return { success: true };
}

// ─── publishVersion ────────────────────────────────────

export async function publishVersion(
  formData: FormData
): Promise<ActionResult> {
  const userId = await requireUser();

  const raw = {
    assetId: formData.get("assetId"),
    version: formData.get("version"),
    changelog: formData.get("changelog"),
  };

  const parsed = publishVersionSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const asset = await db.asset.findUnique({
    where: { id: parsed.data.assetId },
  });
  if (!asset || asset.authorId !== userId) {
    return { success: false, error: "Asset not found or not authorized" };
  }

  const existingVersion = await db.assetVersion.findFirst({
    where: { assetId: asset.id, version: parsed.data.version },
  });
  if (existingVersion) {
    return { success: false, error: "This version already exists" };
  }

  await db.$transaction([
    db.assetVersion.create({
      data: {
        assetId: asset.id,
        version: parsed.data.version,
        changelog: parsed.data.changelog,
        content: asset.content,
      },
    }),
    db.asset.update({
      where: { id: asset.id },
      data: { currentVersion: parsed.data.version },
    }),
  ]);

  revalidatePath(`/assets/${asset.slug}`);
  return { success: true };
}

// ─── downloadAsset ─────────────────────────────────────

export async function downloadAsset(
  assetId: string,
  version: string
): Promise<ActionResult> {
  const user = await currentUser();

  const asset = await db.asset.findUnique({ where: { id: assetId } });
  if (!asset) {
    return { success: false, error: "Asset not found" };
  }

  await db.$transaction([
    db.download.create({
      data: {
        assetId: asset.id,
        userId: user?.id ?? null,
        version,
      },
    }),
    db.asset.update({
      where: { id: asset.id },
      data: { downloadCount: { increment: 1 } },
    }),
  ]);

  revalidatePath(`/assets/${asset.slug}`);
  return { success: true };
}
