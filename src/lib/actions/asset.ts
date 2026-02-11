"use server";

import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import slugify from "slugify";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import {
  createAssetSchema,
  updateAssetSchema,
  publishVersionSchema,
} from "@/lib/validations/asset";

// ─── Rate Limiters ────────────────────────────────────

const createLimiter = rateLimit({ interval: 5 * 60_000, limit: 10 });
const downloadLimiter = rateLimit({ interval: 60_000, limit: 30 });
const forkLimiter = rateLimit({ interval: 5 * 60_000, limit: 5 });

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

type ActionResult =
  | { success: true; redirect?: string }
  | { success: false; error: string };

// ─── createAsset ───────────────────────────────────────

export async function createAsset(formData: FormData): Promise<ActionResult> {
  const userId = await requireUser();

  const { success: withinLimit } = createLimiter.check(userId);
  if (!withinLimit) {
    throw new Error("Rate limit exceeded. Please try again later.");
  }

  const storageType = (formData.get("storageType") as string) ?? "INLINE";
  const bundleUrl = formData.get("bundleUrl") as string | null;
  const bundleManifestRaw = formData.get("bundleManifest") as string | null;
  const bundleManifest = bundleManifestRaw ? JSON.parse(bundleManifestRaw) : undefined;

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
    storageType,
    content: formData.get("content") || undefined,
    primaryFileName: formData.get("primaryFileName"),
    bundleUrl: bundleUrl || undefined,
    bundleManifest,
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
      storageType: data.storageType,
      content: data.content ?? null,
      primaryFileName: data.primaryFileName,
      bundleUrl: data.bundleUrl ?? null,
      bundleManifest: data.bundleManifest ?? undefined,
      authorId: userId,
    },
  });

  revalidatePath("/dashboard");
  return { success: true, redirect: `/assets/${slug}` };
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

  const storageType = (formData.get("storageType") as string) || undefined;
  const bundleUrl = (formData.get("bundleUrl") as string) || undefined;
  const bundleManifestRaw = formData.get("bundleManifest") as string | null;
  const bundleManifest = bundleManifestRaw ? JSON.parse(bundleManifestRaw) : undefined;

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
    storageType,
    content: formData.get("content") || undefined,
    primaryFileName: formData.get("primaryFileName") || undefined,
    bundleUrl,
    bundleManifest,
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
    revalidatePath(`/assets/${updated.slug}`);
    return { success: true, redirect: `/assets/${updateData.slug}` };
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
        bundleUrl: asset.bundleUrl,
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

  const dlKey = user?.id ?? `anon-${assetId}`;
  const { success: withinLimit } = downloadLimiter.check(dlKey);
  if (!withinLimit) {
    return { success: false, error: "Rate limit exceeded. Please try again later." };
  }

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

// ─── forkAsset ────────────────────────────────────────

type ForkResult =
  | { success: true; slug: string }
  | { success: false; error: string };

export async function forkAsset(assetId: string): Promise<ForkResult> {
  const userId = await requireUser();

  const { success: withinLimit } = forkLimiter.check(userId);
  if (!withinLimit) {
    return { success: false, error: "Rate limit exceeded. Please try again later." };
  }

  const source = await db.asset.findUnique({ where: { id: assetId } });
  if (!source || source.deletedAt) {
    return { success: false, error: "Asset not found" };
  }

  if (source.visibility === "PRIVATE") {
    return { success: false, error: "Cannot fork a private asset" };
  }

  if (source.authorId === userId) {
    return { success: false, error: "Cannot fork your own asset" };
  }

  const slug = await generateUniqueSlug(source.name);

  await db.$transaction([
    db.asset.create({
      data: {
        slug,
        name: source.name,
        description: source.description,
        type: source.type,
        primaryPlatform: source.primaryPlatform,
        compatiblePlatforms: source.compatiblePlatforms,
        category: source.category,
        tags: source.tags,
        license: source.license,
        licenseText: source.licenseText,
        storageType: source.storageType,
        installScope: source.installScope,
        content: source.content,
        primaryFileName: source.primaryFileName,
        bundleUrl: source.bundleUrl,
        bundleManifest: source.bundleManifest ?? undefined,
        visibility: "PRIVATE",
        currentVersion: "1.0.0",
        forkedFromId: source.id,
        authorId: userId,
      },
    }),
    db.asset.update({
      where: { id: source.id },
      data: { forkCount: { increment: 1 } },
    }),
  ]);

  revalidatePath("/dashboard");
  revalidatePath(`/assets/${source.slug}`);
  return { success: true, slug };
}
