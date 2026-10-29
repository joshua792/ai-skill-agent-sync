import JSZip from "jszip";

export interface BundleEntry {
  /** Path segments relative to the install directory, e.g. ["deploy", "SKILL.md"] */
  segments: string[];
  data: Uint8Array;
}

/**
 * Splits a zip entry path into safe segments. Returns null for paths that
 * could escape the install directory (absolute, "..", drive letters).
 */
export function safePathSegments(path: string): string[] | null {
  const normalized = path.replace(/\\/g, "/");
  if (normalized.startsWith("/") || /^[a-zA-Z]:/.test(normalized)) return null;
  const segments = normalized.split("/").filter((s) => s && s !== ".");
  if (segments.length === 0 || segments.some((s) => s === "..")) return null;
  return segments;
}

/** Reads every file from a bundle zip, skipping directories and unsafe paths. */
export async function extractBundle(
  zipData: ArrayBuffer | Uint8Array
): Promise<BundleEntry[]> {
  const zip = await JSZip.loadAsync(zipData);
  const entries: BundleEntry[] = [];
  for (const entry of Object.values(zip.files)) {
    if (entry.dir) continue;
    const segments = safePathSegments(entry.name);
    if (!segments) continue;
    entries.push({ segments, data: await entry.async("uint8array") });
  }
  return entries;
}
