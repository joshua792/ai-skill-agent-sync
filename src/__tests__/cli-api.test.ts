import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { bumpPatchVersion } from "@/lib/version";
import {
  syncManifestQuerySchema,
  assetContentPutSchema,
  cliMachineRegisterSchema,
  cliSyncReportSchema,
  cliCreateAssetSchema,
} from "@/lib/validations/cli";

// ═══════════════════════════════════════════════════════
// Version Utility
// ═══════════════════════════════════════════════════════

describe("bumpPatchVersion", () => {
  it('bumps "1.0.0" to "1.0.1"', () => {
    expect(bumpPatchVersion("1.0.0")).toBe("1.0.1");
  });

  it('bumps "2.3.9" to "2.3.10"', () => {
    expect(bumpPatchVersion("2.3.9")).toBe("2.3.10");
  });

  it('bumps "0.0.0" to "0.0.1"', () => {
    expect(bumpPatchVersion("0.0.0")).toBe("0.0.1");
  });

  it('bumps "1.2.3" to "1.2.4"', () => {
    expect(bumpPatchVersion("1.2.3")).toBe("1.2.4");
  });

  it("throws on invalid input", () => {
    expect(() => bumpPatchVersion("not-a-version")).toThrow("Invalid semver");
  });

  it("throws on partial version", () => {
    expect(() => bumpPatchVersion("1.0")).toThrow("Invalid semver");
  });
});

// ═══════════════════════════════════════════════════════
// CLI Validation Schemas
// ═══════════════════════════════════════════════════════

describe("syncManifestQuerySchema", () => {
  it("accepts valid machineId", () => {
    const result = syncManifestQuerySchema.safeParse({ machineId: "abc123" });
    expect(result.success).toBe(true);
  });

  it("rejects empty machineId", () => {
    const result = syncManifestQuerySchema.safeParse({ machineId: "" });
    expect(result.success).toBe(false);
  });
});

describe("assetContentPutSchema", () => {
  it("accepts valid input", () => {
    const result = assetContentPutSchema.safeParse({
      content: "# My Skill",
      localHash: "abc123def456",
      machineId: "machine_1",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty content", () => {
    const result = assetContentPutSchema.safeParse({
      content: "",
      localHash: "abc",
      machineId: "m1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing localHash", () => {
    const result = assetContentPutSchema.safeParse({
      content: "hello",
      localHash: "",
      machineId: "m1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing machineId", () => {
    const result = assetContentPutSchema.safeParse({
      content: "hello",
      localHash: "abc",
      machineId: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("cliMachineRegisterSchema", () => {
  it("accepts valid input", () => {
    const result = cliMachineRegisterSchema.safeParse({
      name: "My Laptop",
      machineIdentifier: "my-laptop-abc1",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = cliMachineRegisterSchema.safeParse({
      name: "",
      machineIdentifier: "abc",
    });
    expect(result.success).toBe(false);
  });

  it("rejects identifier with spaces", () => {
    const result = cliMachineRegisterSchema.safeParse({
      name: "Test",
      machineIdentifier: "has spaces",
    });
    expect(result.success).toBe(false);
  });

  it("accepts identifier with hyphens and underscores", () => {
    const result = cliMachineRegisterSchema.safeParse({
      name: "Test",
      machineIdentifier: "my_laptop-01",
    });
    expect(result.success).toBe(true);
  });
});

describe("cliSyncReportSchema", () => {
  it("accepts valid push report", () => {
    const result = cliSyncReportSchema.safeParse({
      machineId: "m1",
      assetId: "a1",
      syncedVersion: "1.0.0",
      direction: "push",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid pull report with optional fields", () => {
    const result = cliSyncReportSchema.safeParse({
      machineId: "m1",
      assetId: "a1",
      syncedVersion: "1.0.0",
      localHash: "abc123",
      installPath: ".claude/skills/my-skill.md",
      direction: "pull",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid direction", () => {
    const result = cliSyncReportSchema.safeParse({
      machineId: "m1",
      assetId: "a1",
      syncedVersion: "1.0.0",
      direction: "invalid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing machineId", () => {
    const result = cliSyncReportSchema.safeParse({
      machineId: "",
      assetId: "a1",
      syncedVersion: "1.0.0",
      direction: "push",
    });
    expect(result.success).toBe(false);
  });

  it("rejects installPath over 1024 chars", () => {
    const result = cliSyncReportSchema.safeParse({
      machineId: "m1",
      assetId: "a1",
      syncedVersion: "1.0.0",
      installPath: "a".repeat(1025),
      direction: "push",
    });
    expect(result.success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════
// cliCreateAssetSchema
// ═══════════════════════════════════════════════════════

describe("cliCreateAssetSchema", () => {
  const validInput = {
    name: "My Skill",
    content: "# Skill content",
    type: "SKILL",
    primaryPlatform: "CLAUDE_CODE",
    primaryFileName: "my-skill.md",
    installScope: "PROJECT",
    machineId: "machine_123",
  };

  it("accepts valid input", () => {
    const result = cliCreateAssetSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = cliCreateAssetSchema.safeParse({ ...validInput, name: "" });
    expect(result.success).toBe(false);
  });

  it("accepts name at max 200 chars", () => {
    const result = cliCreateAssetSchema.safeParse({
      ...validInput,
      name: "a".repeat(200),
    });
    expect(result.success).toBe(true);
  });

  it("rejects name over 200 chars", () => {
    const result = cliCreateAssetSchema.safeParse({
      ...validInput,
      name: "a".repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty content", () => {
    const result = cliCreateAssetSchema.safeParse({ ...validInput, content: "" });
    expect(result.success).toBe(false);
  });

  it.each(["SKILL", "COMMAND", "AGENT"])("accepts type %s", (type) => {
    const result = cliCreateAssetSchema.safeParse({ ...validInput, type });
    expect(result.success).toBe(true);
  });

  it("rejects invalid type", () => {
    const result = cliCreateAssetSchema.safeParse({ ...validInput, type: "INVALID" });
    expect(result.success).toBe(false);
  });

  it.each([
    "CLAUDE_CODE", "GEMINI_CLI", "CHATGPT", "CURSOR", "WINDSURF", "AIDER", "OTHER",
  ])("accepts platform %s", (platform) => {
    const result = cliCreateAssetSchema.safeParse({
      ...validInput,
      primaryPlatform: platform,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid platform", () => {
    const result = cliCreateAssetSchema.safeParse({
      ...validInput,
      primaryPlatform: "INVALID",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty primaryFileName", () => {
    const result = cliCreateAssetSchema.safeParse({
      ...validInput,
      primaryFileName: "",
    });
    expect(result.success).toBe(false);
  });

  it("accepts primaryFileName at 255 chars", () => {
    const result = cliCreateAssetSchema.safeParse({
      ...validInput,
      primaryFileName: "a".repeat(255),
    });
    expect(result.success).toBe(true);
  });

  it("defaults installScope to PROJECT when omitted", () => {
    const { installScope, ...rest } = validInput;
    const result = cliCreateAssetSchema.safeParse(rest);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.installScope).toBe("PROJECT");
    }
  });

  it("rejects empty machineId", () => {
    const result = cliCreateAssetSchema.safeParse({ ...validInput, machineId: "" });
    expect(result.success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════
// Source Contracts — Route Files
// ═══════════════════════════════════════════════════════

describe("CLI API Route Contracts", () => {
  const routeBase = path.resolve(__dirname, "../app/api/cli");

  it("/api/cli/whoami route exists", () => {
    const routePath = path.join(routeBase, "whoami", "route.ts");
    expect(fs.existsSync(routePath)).toBe(true);
  });

  it("/api/cli/sync-manifest route exists", () => {
    const routePath = path.join(routeBase, "sync-manifest", "route.ts");
    expect(fs.existsSync(routePath)).toBe(true);
  });

  it("/api/cli/assets/[id]/content route exists", () => {
    const routePath = path.join(routeBase, "assets", "[id]", "content", "route.ts");
    expect(fs.existsSync(routePath)).toBe(true);
  });

  it("/api/cli/machines/register route exists", () => {
    const routePath = path.join(routeBase, "machines", "register", "route.ts");
    expect(fs.existsSync(routePath)).toBe(true);
  });

  it("/api/cli/sync route exists", () => {
    const routePath = path.join(routeBase, "sync", "route.ts");
    expect(fs.existsSync(routePath)).toBe(true);
  });

  it("all CLI routes use requireApiKeyAuth (not currentUser)", () => {
    const routes = [
      path.join(routeBase, "whoami", "route.ts"),
      path.join(routeBase, "sync-manifest", "route.ts"),
      path.join(routeBase, "assets", "[id]", "content", "route.ts"),
      path.join(routeBase, "machines", "register", "route.ts"),
      path.join(routeBase, "sync", "route.ts"),
    ];

    for (const routePath of routes) {
      const content = fs.readFileSync(routePath, "utf-8");
      expect(content).toContain("requireApiKeyAuth");
      expect(content).not.toContain("currentUser");
    }
  });

  it("all CLI routes have rate limiting", () => {
    const routes = [
      path.join(routeBase, "whoami", "route.ts"),
      path.join(routeBase, "sync-manifest", "route.ts"),
      path.join(routeBase, "assets", "[id]", "content", "route.ts"),
      path.join(routeBase, "machines", "register", "route.ts"),
      path.join(routeBase, "sync", "route.ts"),
    ];

    for (const routePath of routes) {
      const content = fs.readFileSync(routePath, "utf-8");
      expect(content).toContain("rateLimit");
    }
  });

  it("PUT content route uses bumpPatchVersion", () => {
    const routePath = path.join(routeBase, "assets", "[id]", "content", "route.ts");
    const content = fs.readFileSync(routePath, "utf-8");
    expect(content).toContain("bumpPatchVersion");
  });

  it("PUT content route creates AssetVersion snapshot", () => {
    const routePath = path.join(routeBase, "assets", "[id]", "content", "route.ts");
    const content = fs.readFileSync(routePath, "utf-8");
    expect(content).toContain("assetVersion.create");
  });

  it("PUT content route updates MachineSyncState", () => {
    const routePath = path.join(routeBase, "assets", "[id]", "content", "route.ts");
    const content = fs.readFileSync(routePath, "utf-8");
    expect(content).toContain("machineSyncState.upsert");
  });

  it("PUT content route rejects BUNDLE assets", () => {
    const routePath = path.join(routeBase, "assets", "[id]", "content", "route.ts");
    const content = fs.readFileSync(routePath, "utf-8");
    expect(content).toContain("BUNDLE");
  });

  it("version.ts exports bumpPatchVersion", () => {
    const versionPath = path.resolve(__dirname, "../lib/version.ts");
    const content = fs.readFileSync(versionPath, "utf-8");
    expect(content).toContain("export function bumpPatchVersion");
  });

  it("/api/cli/assets route exists", () => {
    const routePath = path.join(routeBase, "assets", "route.ts");
    expect(fs.existsSync(routePath)).toBe(true);
  });

  it("/api/cli/assets route uses requireApiKeyAuth", () => {
    const routePath = path.join(routeBase, "assets", "route.ts");
    const content = fs.readFileSync(routePath, "utf-8");
    expect(content).toContain("requireApiKeyAuth");
    expect(content).not.toContain("currentUser");
  });

  it("/api/cli/assets route has rate limiting", () => {
    const routePath = path.join(routeBase, "assets", "route.ts");
    const content = fs.readFileSync(routePath, "utf-8");
    expect(content).toContain("rateLimit");
  });

  it("/api/cli/assets route uses cliCreateAssetSchema", () => {
    const routePath = path.join(routeBase, "assets", "route.ts");
    const content = fs.readFileSync(routePath, "utf-8");
    expect(content).toContain("cliCreateAssetSchema");
  });

  it("/api/cli/assets route creates asset with db.asset.create", () => {
    const routePath = path.join(routeBase, "assets", "route.ts");
    const content = fs.readFileSync(routePath, "utf-8");
    expect(content).toContain("db.asset.create");
  });

  it("/api/cli/assets route returns 201", () => {
    const routePath = path.join(routeBase, "assets", "route.ts");
    const content = fs.readFileSync(routePath, "utf-8");
    expect(content).toContain("201");
  });

  it("/api/cli/assets route verifies machine ownership", () => {
    const routePath = path.join(routeBase, "assets", "route.ts");
    const content = fs.readFileSync(routePath, "utf-8");
    expect(content).toContain("userMachine.findFirst");
  });
});
