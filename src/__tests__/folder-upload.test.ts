import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import {
  isIgnoredPath,
  pickPrimaryFile,
  zipFolder,
  type FolderFile,
} from "@/lib/folder-upload";

function folderFile(path: string, content = "x"): FolderFile {
  return { path, file: new File([content], path.split("/").pop()!) };
}

describe("isIgnoredPath", () => {
  it("ignores OS junk files", () => {
    expect(isIgnoredPath("deploy/.DS_Store")).toBe(true);
    expect(isIgnoredPath("deploy/references/Thumbs.db")).toBe(true);
  });

  it("ignores .git and node_modules anywhere in the path", () => {
    expect(isIgnoredPath("deploy/.git/config")).toBe(true);
    expect(isIgnoredPath("deploy/scripts/node_modules/x/index.js")).toBe(true);
  });

  it("keeps normal skill files", () => {
    expect(isIgnoredPath("deploy/SKILL.md")).toBe(false);
    expect(isIgnoredPath("deploy/references/api.md")).toBe(false);
  });
});

describe("pickPrimaryFile", () => {
  it("prefers SKILL.md at the folder root", () => {
    const files = [
      { path: "deploy/README.md" },
      { path: "deploy/references/SKILL.md" },
      { path: "deploy/SKILL.md" },
    ];
    expect(pickPrimaryFile(files)?.path).toBe("deploy/SKILL.md");
  });

  it("matches known names case-insensitively", () => {
    expect(pickPrimaryFile([{ path: "deploy/skill.md" }])?.path).toBe("deploy/skill.md");
  });

  it("falls back to the first root-level .md file", () => {
    const files = [
      { path: "deploy/references/a.md" },
      { path: "deploy/notes.txt" },
      { path: "deploy/deploy.md" },
    ];
    expect(pickPrimaryFile(files)?.path).toBe("deploy/deploy.md");
  });

  it("returns null when there is no root-level .md file", () => {
    expect(pickPrimaryFile([{ path: "deploy/references/a.md" }])).toBeNull();
  });
});

describe("zipFolder", () => {
  it("keeps the folder name and nested paths in the zip", async () => {
    const blob = await zipFolder([
      folderFile("deploy/SKILL.md", "# Deploy"),
      folderFile("deploy/references/api.md", "API notes"),
    ]);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const paths = Object.values(zip.files)
      .filter((f) => !f.dir)
      .map((f) => f.name)
      .sort();
    expect(paths).toEqual(["deploy/SKILL.md", "deploy/references/api.md"]);
    expect(await zip.file("deploy/SKILL.md")!.async("string")).toBe("# Deploy");
  });
});
