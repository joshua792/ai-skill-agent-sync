import JSZip from "jszip";

export interface FolderFile {
  /** Path including the top-level folder, e.g. "deploy/references/api.md" */
  path: string;
  file: File;
}

const IGNORED_SEGMENTS = new Set([".git", "node_modules", "__pycache__"]);
const IGNORED_FILES = new Set([".DS_Store", "Thumbs.db", "desktop.ini"]);

// Preferred primary files, checked in order at the folder root
const PRIMARY_CANDIDATES = ["SKILL.md", "AGENT.md", "COMMAND.md", "README.md"];

export function isIgnoredPath(path: string): boolean {
  const parts = path.split("/");
  const fileName = parts[parts.length - 1];
  return (
    IGNORED_FILES.has(fileName) ||
    parts.some((p) => IGNORED_SEGMENTS.has(p))
  );
}

/**
 * Picks the file that describes the asset: a known name (SKILL.md, ...) at the
 * folder root, else the first root-level .md file. Returns null if none.
 */
export function pickPrimaryFile<T extends { path: string }>(files: T[]): T | null {
  const rootFiles = files.filter((f) => f.path.split("/").length === 2);
  for (const candidate of PRIMARY_CANDIDATES) {
    const match = rootFiles.find(
      (f) => f.path.split("/")[1].toLowerCase() === candidate.toLowerCase()
    );
    if (match) return match;
  }
  return rootFiles.find((f) => f.path.toLowerCase().endsWith(".md")) ?? null;
}

/** Files from an `<input webkitdirectory>` selection. */
export function filesFromDirectoryInput(list: FileList): FolderFile[] {
  return Array.from(list)
    .map((file) => ({ path: file.webkitRelativePath || file.name, file }))
    .filter((f) => !isIgnoredPath(f.path));
}

/** Recursively reads a folder dropped via drag-and-drop. */
export async function filesFromDirectoryEntry(
  root: FileSystemDirectoryEntry
): Promise<FolderFile[]> {
  const results: FolderFile[] = [];

  async function walk(dir: FileSystemDirectoryEntry, prefix: string) {
    const reader = dir.createReader();
    // readEntries returns results in batches; call until it returns none
    let batch: FileSystemEntry[];
    do {
      batch = await new Promise<FileSystemEntry[]>((resolve, reject) =>
        reader.readEntries(resolve, reject)
      );
      for (const entry of batch) {
        const path = `${prefix}/${entry.name}`;
        if (isIgnoredPath(path)) continue;
        if (entry.isDirectory) {
          await walk(entry as FileSystemDirectoryEntry, path);
        } else {
          const file = await new Promise<File>((resolve, reject) =>
            (entry as FileSystemFileEntry).file(resolve, reject)
          );
          results.push({ path, file });
        }
      }
    } while (batch.length > 0);
  }

  await walk(root, root.name);
  return results;
}

export async function zipFolder(files: FolderFile[]): Promise<Blob> {
  const zip = new JSZip();
  for (const { path, file } of files) {
    zip.file(path, await file.arrayBuffer());
  }
  return zip.generateAsync({ type: "blob", compression: "DEFLATE" });
}
