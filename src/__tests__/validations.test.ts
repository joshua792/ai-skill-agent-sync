import { describe, it, expect } from "vitest";
import {
  createAssetSchema,
  updateAssetSchema,
  publishVersionSchema,
} from "@/lib/validations/asset";
import {
  registerMachineSchema,
  syncAssetSchema,
} from "@/lib/validations/machine";

// ─── Helper: valid base input for createAssetSchema ───

function validAssetInput(overrides: Record<string, unknown> = {}) {
  return {
    name: "Test Asset",
    description: "A test asset description that is long enough",
    type: "SKILL",
    primaryPlatform: "CLAUDE_CODE",
    compatiblePlatforms: [],
    category: "OTHER",
    tags: "test, example",
    visibility: "PRIVATE",
    license: "MIT",
    installScope: "PROJECT",
    content: "# Hello World",
    primaryFileName: "SKILL.md",
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════
// createAssetSchema
// ═══════════════════════════════════════════════════════

describe("createAssetSchema", () => {
  it("accepts valid input with all fields", () => {
    const result = createAssetSchema.safeParse(validAssetInput());
    expect(result.success).toBe(true);
  });

  // ── Name boundaries ──
  describe("name", () => {
    it("rejects 1 character", () => {
      const result = createAssetSchema.safeParse(validAssetInput({ name: "x" }));
      expect(result.success).toBe(false);
    });

    it("accepts 2 characters", () => {
      const result = createAssetSchema.safeParse(validAssetInput({ name: "ab" }));
      expect(result.success).toBe(true);
    });

    it("accepts 100 characters", () => {
      const result = createAssetSchema.safeParse(validAssetInput({ name: "a".repeat(100) }));
      expect(result.success).toBe(true);
    });

    it("rejects 101 characters", () => {
      const result = createAssetSchema.safeParse(validAssetInput({ name: "a".repeat(101) }));
      expect(result.success).toBe(false);
    });
  });

  // ── Description boundaries ──
  describe("description", () => {
    it("rejects 9 characters", () => {
      const result = createAssetSchema.safeParse(validAssetInput({ description: "a".repeat(9) }));
      expect(result.success).toBe(false);
    });

    it("accepts 10 characters", () => {
      const result = createAssetSchema.safeParse(validAssetInput({ description: "a".repeat(10) }));
      expect(result.success).toBe(true);
    });

    it("accepts 280 characters", () => {
      const result = createAssetSchema.safeParse(validAssetInput({ description: "a".repeat(280) }));
      expect(result.success).toBe(true);
    });

    it("rejects 281 characters", () => {
      const result = createAssetSchema.safeParse(validAssetInput({ description: "a".repeat(281) }));
      expect(result.success).toBe(false);
    });
  });

  // ── Type enum ──
  describe("type", () => {
    it.each(["SKILL", "COMMAND", "AGENT"])("accepts %s", (type) => {
      const result = createAssetSchema.safeParse(validAssetInput({ type }));
      expect(result.success).toBe(true);
    });

    it("rejects INVALID", () => {
      const result = createAssetSchema.safeParse(validAssetInput({ type: "INVALID" }));
      expect(result.success).toBe(false);
    });
  });

  // ── Platform enum ──
  describe("primaryPlatform", () => {
    const platforms = ["CLAUDE_CODE", "GEMINI_CLI", "CHATGPT", "CURSOR", "WINDSURF", "AIDER", "OTHER"];

    it.each(platforms)("accepts %s", (platform) => {
      const result = createAssetSchema.safeParse(validAssetInput({ primaryPlatform: platform }));
      expect(result.success).toBe(true);
    });

    it("rejects INVALID", () => {
      const result = createAssetSchema.safeParse(validAssetInput({ primaryPlatform: "INVALID" }));
      expect(result.success).toBe(false);
    });
  });

  // ── Category enum ──
  describe("category", () => {
    const categories = [
      "CODE_GENERATION", "CODE_REVIEW", "DOCUMENTATION", "TESTING",
      "DEVOPS", "DATA_ANALYSIS", "WRITING", "RESEARCH",
      "PRODUCTIVITY", "DESIGN", "DOMAIN_SPECIFIC", "OTHER",
    ];

    it.each(categories)("accepts %s", (category) => {
      const result = createAssetSchema.safeParse(validAssetInput({ category }));
      expect(result.success).toBe(true);
    });

    it("rejects INVALID", () => {
      const result = createAssetSchema.safeParse(validAssetInput({ category: "INVALID" }));
      expect(result.success).toBe(false);
    });
  });

  // ── Visibility enum ──
  describe("visibility", () => {
    it.each(["PRIVATE", "SHARED", "PUBLIC"])("accepts %s", (visibility) => {
      const result = createAssetSchema.safeParse(validAssetInput({ visibility }));
      expect(result.success).toBe(true);
    });

    it("rejects INVALID", () => {
      const result = createAssetSchema.safeParse(validAssetInput({ visibility: "INVALID" }));
      expect(result.success).toBe(false);
    });
  });

  // ── License enum ──
  describe("license", () => {
    const licenses = ["MIT", "APACHE_2", "GPL_3", "BSD_3", "CC_BY_4", "CC_BY_SA_4", "UNLICENSED", "CUSTOM"];

    it.each(licenses)("accepts %s", (license) => {
      const result = createAssetSchema.safeParse(validAssetInput({ license }));
      expect(result.success).toBe(true);
    });

    it("rejects INVALID", () => {
      const result = createAssetSchema.safeParse(validAssetInput({ license: "INVALID" }));
      expect(result.success).toBe(false);
    });
  });

  // ── InstallScope enum ──
  describe("installScope", () => {
    it.each(["USER", "PROJECT"])("accepts %s", (installScope) => {
      const result = createAssetSchema.safeParse(validAssetInput({ installScope }));
      expect(result.success).toBe(true);
    });

    it("rejects INVALID", () => {
      const result = createAssetSchema.safeParse(validAssetInput({ installScope: "INVALID" }));
      expect(result.success).toBe(false);
    });
  });

  // ── Tags transform ──
  describe("tags", () => {
    it("splits comma-separated string", () => {
      const result = createAssetSchema.safeParse(validAssetInput({ tags: "git, commit, automation" }));
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tags).toEqual(["git", "commit", "automation"]);
      }
    });

    it("returns empty array for empty string", () => {
      const result = createAssetSchema.safeParse(validAssetInput({ tags: "" }));
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tags).toEqual([]);
      }
    });

    it("handles single tag", () => {
      const result = createAssetSchema.safeParse(validAssetInput({ tags: "single" }));
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tags).toEqual(["single"]);
      }
    });
  });

  // ── Content (inline requires content via .refine()) ──
  describe("content", () => {
    it("rejects empty content for INLINE storageType", () => {
      const result = createAssetSchema.safeParse(validAssetInput({ content: "", storageType: "INLINE" }));
      expect(result.success).toBe(false);
    });

    it("accepts content for INLINE storageType", () => {
      const result = createAssetSchema.safeParse(validAssetInput({ content: "x", storageType: "INLINE" }));
      expect(result.success).toBe(true);
    });

    it("accepts empty content for BUNDLE storageType with bundleUrl", () => {
      const result = createAssetSchema.safeParse(validAssetInput({
        content: "",
        storageType: "BUNDLE",
        bundleUrl: "https://example.com/bundle.zip",
      }));
      expect(result.success).toBe(true);
    });

    it("rejects BUNDLE without bundleUrl", () => {
      const result = createAssetSchema.safeParse(validAssetInput({
        content: "",
        storageType: "BUNDLE",
      }));
      expect(result.success).toBe(false);
    });
  });

  // ── StorageType enum ──
  describe("storageType", () => {
    it.each(["INLINE", "BUNDLE"])("accepts %s", (storageType) => {
      const input = storageType === "BUNDLE"
        ? validAssetInput({ storageType, bundleUrl: "https://example.com/bundle.zip" })
        : validAssetInput({ storageType });
      const result = createAssetSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("defaults to INLINE when omitted", () => {
      const result = createAssetSchema.safeParse(validAssetInput());
      expect(result.success).toBe(true);
    });
  });

  // ── PrimaryFileName ──
  describe("primaryFileName", () => {
    it("rejects empty string", () => {
      const result = createAssetSchema.safeParse(validAssetInput({ primaryFileName: "" }));
      expect(result.success).toBe(false);
    });

    it("accepts 255 characters", () => {
      const result = createAssetSchema.safeParse(validAssetInput({ primaryFileName: "a".repeat(255) }));
      expect(result.success).toBe(true);
    });

    it("rejects 256 characters", () => {
      const result = createAssetSchema.safeParse(validAssetInput({ primaryFileName: "a".repeat(256) }));
      expect(result.success).toBe(false);
    });
  });

  // ── Defaults ──
  describe("defaults", () => {
    it("defaults visibility to PRIVATE when omitted", () => {
      const input = validAssetInput();
      delete (input as Record<string, unknown>).visibility;
      const result = createAssetSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.visibility).toBe("PRIVATE");
      }
    });

    it("defaults license to UNLICENSED when omitted", () => {
      const input = validAssetInput();
      delete (input as Record<string, unknown>).license;
      const result = createAssetSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.license).toBe("UNLICENSED");
      }
    });

    it("defaults installScope to PROJECT when omitted", () => {
      const input = validAssetInput();
      delete (input as Record<string, unknown>).installScope;
      const result = createAssetSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.installScope).toBe("PROJECT");
      }
    });

    it("defaults compatiblePlatforms to [] when omitted", () => {
      const input = validAssetInput();
      delete (input as Record<string, unknown>).compatiblePlatforms;
      const result = createAssetSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.compatiblePlatforms).toEqual([]);
      }
    });
  });
});

// ═══════════════════════════════════════════════════════
// updateAssetSchema
// ═══════════════════════════════════════════════════════

describe("updateAssetSchema", () => {
  it("accepts empty object (all fields optional)", () => {
    const result = updateAssetSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts individual valid field", () => {
    const result = updateAssetSchema.safeParse({ name: "Updated Name" });
    expect(result.success).toBe(true);
  });

  it("rejects name below min length", () => {
    const result = updateAssetSchema.safeParse({ name: "x" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid type enum", () => {
    const result = updateAssetSchema.safeParse({ type: "INVALID" });
    expect(result.success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════
// publishVersionSchema
// ═══════════════════════════════════════════════════════

describe("publishVersionSchema", () => {
  describe("valid semver", () => {
    it.each(["1.0.0", "0.1.0", "10.20.30"])("accepts %s", (version) => {
      const result = publishVersionSchema.safeParse({
        assetId: "abc123",
        version,
        changelog: "Initial release",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("invalid semver", () => {
    it.each(["1.0", "v1.0.0", "1.0.0-beta", "abc"])("rejects %s", (version) => {
      const result = publishVersionSchema.safeParse({
        assetId: "abc123",
        version,
        changelog: "Initial release",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("changelog boundaries", () => {
    it("rejects empty changelog", () => {
      const result = publishVersionSchema.safeParse({
        assetId: "abc123",
        version: "1.0.0",
        changelog: "",
      });
      expect(result.success).toBe(false);
    });

    it("accepts 1 character", () => {
      const result = publishVersionSchema.safeParse({
        assetId: "abc123",
        version: "1.0.0",
        changelog: "x",
      });
      expect(result.success).toBe(true);
    });

    it("accepts 2000 characters", () => {
      const result = publishVersionSchema.safeParse({
        assetId: "abc123",
        version: "1.0.0",
        changelog: "a".repeat(2000),
      });
      expect(result.success).toBe(true);
    });

    it("rejects 2001 characters", () => {
      const result = publishVersionSchema.safeParse({
        assetId: "abc123",
        version: "1.0.0",
        changelog: "a".repeat(2001),
      });
      expect(result.success).toBe(false);
    });
  });

  it("rejects empty assetId", () => {
    const result = publishVersionSchema.safeParse({
      assetId: "",
      version: "1.0.0",
      changelog: "test",
    });
    expect(result.success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════
// registerMachineSchema
// ═══════════════════════════════════════════════════════

describe("registerMachineSchema", () => {
  it("accepts valid input", () => {
    const result = registerMachineSchema.safeParse({
      name: "My Laptop",
      machineIdentifier: "my-laptop_01",
    });
    expect(result.success).toBe(true);
  });

  describe("machineIdentifier regex", () => {
    it("accepts alphanumeric with hyphens and underscores", () => {
      const result = registerMachineSchema.safeParse({
        name: "Test",
        machineIdentifier: "my-machine_01",
      });
      expect(result.success).toBe(true);
    });

    it("rejects spaces", () => {
      const result = registerMachineSchema.safeParse({
        name: "Test",
        machineIdentifier: "my machine",
      });
      expect(result.success).toBe(false);
    });

    it("rejects special characters", () => {
      const result = registerMachineSchema.safeParse({
        name: "Test",
        machineIdentifier: "hello@world",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("name boundaries", () => {
    it("rejects empty name", () => {
      const result = registerMachineSchema.safeParse({
        name: "",
        machineIdentifier: "test",
      });
      expect(result.success).toBe(false);
    });

    it("accepts 1 character name", () => {
      const result = registerMachineSchema.safeParse({
        name: "a",
        machineIdentifier: "test",
      });
      expect(result.success).toBe(true);
    });

    it("accepts 100 character name", () => {
      const result = registerMachineSchema.safeParse({
        name: "a".repeat(100),
        machineIdentifier: "test",
      });
      expect(result.success).toBe(true);
    });

    it("rejects 101 character name", () => {
      const result = registerMachineSchema.safeParse({
        name: "a".repeat(101),
        machineIdentifier: "test",
      });
      expect(result.success).toBe(false);
    });
  });
});

// ═══════════════════════════════════════════════════════
// syncAssetSchema
// ═══════════════════════════════════════════════════════

describe("syncAssetSchema", () => {
  it("accepts valid input", () => {
    const result = syncAssetSchema.safeParse({
      machineId: "machine-1",
      assetId: "asset-1",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty machineId", () => {
    const result = syncAssetSchema.safeParse({
      machineId: "",
      assetId: "asset-1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty assetId", () => {
    const result = syncAssetSchema.safeParse({
      machineId: "machine-1",
      assetId: "",
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional installPath", () => {
    const result = syncAssetSchema.safeParse({
      machineId: "machine-1",
      assetId: "asset-1",
      installPath: "my-project/.claude/skills/SKILL.md",
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty string installPath", () => {
    const result = syncAssetSchema.safeParse({
      machineId: "machine-1",
      assetId: "asset-1",
      installPath: "",
    });
    expect(result.success).toBe(true);
  });

  it("accepts absent installPath", () => {
    const result = syncAssetSchema.safeParse({
      machineId: "machine-1",
      assetId: "asset-1",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.installPath).toBeUndefined();
    }
  });

  it("rejects installPath over 1024 chars", () => {
    const result = syncAssetSchema.safeParse({
      machineId: "machine-1",
      assetId: "asset-1",
      installPath: "a".repeat(1025),
    });
    expect(result.success).toBe(false);
  });
});
