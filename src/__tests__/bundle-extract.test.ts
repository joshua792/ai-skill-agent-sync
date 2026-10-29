import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { extractBundle, safePathSegments } from "@/lib/bundle-extract";

describe("safePathSegments", () => {
  it("splits normal relative paths", () => {
    expect(safePathSegments("deploy/references/api.md")).toEqual([
      "deploy",
      "references",
      "api.md",
    ]);
  });

  it("normalizes backslashes and ./ segments", () => {
    expect(safePathSegments("deploy\\.\\SKILL.md")).toEqual(["deploy", "SKILL.md"]);
  });

  it("rejects paths that escape the install directory", () => {
    expect(safePathSegments("../evil.md")).toBeNull();
    expect(safePathSegments("deploy/../../evil.md")).toBeNull();
    expect(safePathSegments("/etc/passwd")).toBeNull();
    expect(safePathSegments("C:/Windows/evil.dll")).toBeNull();
  });
});

describe("extractBundle", () => {
  it("returns every file with its folder structure and skips directories", async () => {
    const zip = new JSZip();
    zip.file("deploy/SKILL.md", "# Deploy");
    zip.file("deploy/references/api.md", "API");
    zip.folder("deploy/empty");
    const data = await zip.generateAsync({ type: "uint8array" });

    const entries = await extractBundle(data);
    const paths = entries.map((e) => e.segments.join("/")).sort();
    expect(paths).toEqual(["deploy/SKILL.md", "deploy/references/api.md"]);

    const skill = entries.find((e) => e.segments.join("/") === "deploy/SKILL.md")!;
    expect(new TextDecoder().decode(skill.data)).toBe("# Deploy");
  });

  it("never yields segments that escape the install directory", async () => {
    const zip = new JSZip();
    zip.file("ok.md", "fine");
    zip.file("../evil.md", "bad");
    const data = await zip.generateAsync({ type: "uint8array" });

    const entries = await extractBundle(data);
    for (const entry of entries) {
      expect(entry.segments).not.toContain("..");
    }
    expect(entries.map((e) => e.segments.join("/"))).toContain("ok.md");
  });
});
