import { describe, it, expect } from "vitest";
import { decideSyncAction } from "../lib/conflict.js";
import {
  getDefaultInstallSubdir,
  getDefaultLocalPath,
  inferTypeFromPath,
  inferProjectName,
} from "../lib/install-paths.js";

// ═══════════════════════════════════════════════════════
// Conflict Resolution
// ═══════════════════════════════════════════════════════

describe("decideSyncAction", () => {
  const older = new Date("2026-01-01T00:00:00Z");
  const newer = new Date("2026-02-01T00:00:00Z");

  it('returns "up-to-date" when nothing changed', () => {
    expect(decideSyncAction(false, false, older, older)).toBe("up-to-date");
  });

  it('returns "push" when only local changed', () => {
    expect(decideSyncAction(true, false, newer, older)).toBe("push");
  });

  it('returns "pull" when only server changed', () => {
    expect(decideSyncAction(false, true, older, newer)).toBe("pull");
  });

  it('returns "conflict-push" when both changed and local is newer', () => {
    expect(decideSyncAction(true, true, newer, older)).toBe("conflict-push");
  });

  it('returns "conflict-pull" when both changed and server is newer', () => {
    expect(decideSyncAction(true, true, older, newer)).toBe("conflict-pull");
  });

  it('returns "conflict-pull" when both changed at same time', () => {
    const same = new Date("2026-01-15T00:00:00Z");
    // equal timestamps → server wins (not strictly greater)
    expect(decideSyncAction(true, true, same, same)).toBe("conflict-pull");
  });
});

// ═══════════════════════════════════════════════════════
// Install Paths
// ═══════════════════════════════════════════════════════

describe("getDefaultInstallSubdir", () => {
  it('CLAUDE_CODE SKILL → ".claude/skills"', () => {
    expect(getDefaultInstallSubdir("CLAUDE_CODE", "SKILL")).toBe(".claude/skills");
  });

  it('CLAUDE_CODE COMMAND → ".claude/commands"', () => {
    expect(getDefaultInstallSubdir("CLAUDE_CODE", "COMMAND")).toBe(".claude/commands");
  });

  it('CLAUDE_CODE AGENT → ".claude/agents"', () => {
    expect(getDefaultInstallSubdir("CLAUDE_CODE", "AGENT")).toBe(".claude/agents");
  });

  it('CURSOR * → ".cursor/rules"', () => {
    expect(getDefaultInstallSubdir("CURSOR", "SKILL")).toBe(".cursor/rules");
    expect(getDefaultInstallSubdir("CURSOR", "AGENT")).toBe(".cursor/rules");
  });

  it('WINDSURF * → ".windsurf/rules"', () => {
    expect(getDefaultInstallSubdir("WINDSURF", "COMMAND")).toBe(".windsurf/rules");
  });

  it('unknown platform falls back to "."', () => {
    expect(getDefaultInstallSubdir("UNKNOWN", "SKILL")).toBe(".");
  });
});

describe("getDefaultLocalPath", () => {
  it("includes primaryFileName", () => {
    const result = getDefaultLocalPath("CLAUDE_CODE", "SKILL", "my-skill.md");
    expect(result).toContain("my-skill.md");
  });

  it("includes subdir for platform", () => {
    const result = getDefaultLocalPath("CLAUDE_CODE", "SKILL", "test.md");
    expect(result).toContain(".claude/skills");
  });

  it("prepends projectDir when provided", () => {
    const result = getDefaultLocalPath(
      "CLAUDE_CODE",
      "SKILL",
      "test.md",
      "/home/user/myproject"
    );
    expect(result).toBe("/home/user/myproject/.claude/skills/test.md");
  });
});

// ═══════════════════════════════════════════════════════
// inferTypeFromPath
// ═══════════════════════════════════════════════════════

describe("inferTypeFromPath", () => {
  it('.claude/skills → CLAUDE_CODE SKILL', () => {
    const result = inferTypeFromPath("/home/user/project/.claude/skills");
    expect(result).toEqual({ platform: "CLAUDE_CODE", type: "SKILL" });
  });

  it('.claude/commands → CLAUDE_CODE COMMAND', () => {
    const result = inferTypeFromPath("/home/user/project/.claude/commands");
    expect(result).toEqual({ platform: "CLAUDE_CODE", type: "COMMAND" });
  });

  it('.claude/agents → CLAUDE_CODE AGENT', () => {
    const result = inferTypeFromPath("/home/user/project/.claude/agents");
    expect(result).toEqual({ platform: "CLAUDE_CODE", type: "AGENT" });
  });

  it('.cursor/rules → CURSOR SKILL', () => {
    const result = inferTypeFromPath("/home/user/project/.cursor/rules");
    expect(result).toEqual({ platform: "CURSOR", type: "SKILL" });
  });

  it('.windsurf/rules → WINDSURF SKILL', () => {
    const result = inferTypeFromPath("/home/user/project/.windsurf/rules");
    expect(result).toEqual({ platform: "WINDSURF", type: "SKILL" });
  });

  it('.aider → AIDER SKILL', () => {
    const result = inferTypeFromPath("/home/user/project/.aider");
    expect(result).toEqual({ platform: "AIDER", type: "SKILL" });
  });

  it("handles Windows backslash paths", () => {
    const result = inferTypeFromPath("C:\\Users\\asujo\\project\\.claude\\skills");
    expect(result).toEqual({ platform: "CLAUDE_CODE", type: "SKILL" });
  });

  it("returns null for unknown path", () => {
    expect(inferTypeFromPath("/home/user/project/src")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(inferTypeFromPath("")).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════
// inferProjectName
// ═══════════════════════════════════════════════════════

describe("inferProjectName", () => {
  it("extracts project name from .claude/skills path", () => {
    expect(inferProjectName("/home/user/myproject/.claude/skills")).toBe("myproject");
  });

  it("extracts project name from .cursor/rules path", () => {
    expect(inferProjectName("/home/user/my-app/.cursor/rules")).toBe("my-app");
  });

  it("extracts project name from Windows path", () => {
    expect(inferProjectName("C:\\Users\\asujo\\CarsonKing\\.claude\\skills")).toBe("CarsonKing");
  });

  it("returns null for path with no known marker", () => {
    expect(inferProjectName("/home/user/project/src")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(inferProjectName("")).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════
// Source Contracts
// ═══════════════════════════════════════════════════════

describe("CLI command file contracts", () => {
  it("all command files exist", async () => {
    // These imports will fail if files are missing
    await import("../commands/link.js");
    await import("../commands/status.js");
    await import("../commands/push.js");
    await import("../commands/pull.js");
    await import("../commands/sync.js");
  });

  it("conflict module exports decideSyncAction", () => {
    expect(typeof decideSyncAction).toBe("function");
  });

  it("install-paths mirrors server-side INSTALL_PATHS for CLAUDE_CODE", () => {
    // These values must match src/lib/constants.ts
    expect(getDefaultInstallSubdir("CLAUDE_CODE", "SKILL")).toBe(".claude/skills");
    expect(getDefaultInstallSubdir("CLAUDE_CODE", "COMMAND")).toBe(".claude/commands");
    expect(getDefaultInstallSubdir("CLAUDE_CODE", "AGENT")).toBe(".claude/agents");
  });
});
