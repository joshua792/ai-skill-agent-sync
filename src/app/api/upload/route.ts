import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { put } from "@vercel/blob";
import JSZip from "jszip";
import type { BundleManifest } from "@/lib/types/bundle";
import { MAX_BUNDLE_SIZE_MB } from "@/lib/constants";
import { rateLimit } from "@/lib/rate-limit";

const MAX_BYTES = MAX_BUNDLE_SIZE_MB * 1024 * 1024;
const uploadLimiter = rateLimit({ interval: 15 * 60_000, limit: 10 });

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { success } = uploadLimiter.check(user.id);
  if (!success) {
    return NextResponse.json(
      { error: "Too many uploads. Try again later." },
      { status: 429 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const primaryFileName = (formData.get("primaryFileName") as string) ?? "";

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!file.name.endsWith(".zip")) {
    return NextResponse.json(
      { error: "Only .zip files are supported" },
      { status: 400 }
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File too large. Maximum size is ${MAX_BUNDLE_SIZE_MB} MB.` },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Parse the zip to build manifest
  const zip = await JSZip.loadAsync(buffer);
  const files: BundleManifest["files"] = [];
  let totalSize = 0;
  let primaryFileContent: string | null = null;

  for (const [path, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    const content = await entry.async("uint8array");
    const size = content.length;
    files.push({ path, size });
    totalSize += size;

    // Extract primary file content
    if (primaryFileName && path === primaryFileName) {
      primaryFileContent = await entry.async("string");
    }
  }

  // If primary file not found by exact match, try matching by filename only
  if (!primaryFileContent && primaryFileName) {
    const baseName = primaryFileName.split("/").pop();
    for (const [path, entry] of Object.entries(zip.files)) {
      if (entry.dir) continue;
      if (path.split("/").pop() === baseName) {
        primaryFileContent = await entry.async("string");
        break;
      }
    }
  }

  files.sort((a, b) => a.path.localeCompare(b.path));

  const manifest: BundleManifest = {
    files,
    totalSize,
    fileCount: files.length,
  };

  // Upload to Vercel Blob
  const blob = await put(`bundles/${user.id}/${Date.now()}-${file.name}`, buffer, {
    access: "public",
    contentType: "application/zip",
  });

  return NextResponse.json({
    url: blob.url,
    manifest,
    primaryFileContent,
  });
}
