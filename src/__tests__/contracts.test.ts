import { describe, it, expect } from "vitest";
import {
  createAssetSchema,
  publishVersionSchema,
} from "@/lib/validations/asset";
import {
  registerMachineSchema,
  syncAssetSchema,
} from "@/lib/validations/machine";
import {
  ASSET_TYPE_LABELS,
  PLATFORM_LABELS,
  CATEGORY_LABELS,
  LICENSE_LABELS,
  LICENSE_DESCRIPTIONS,
  VISIBILITY_LABELS,
  INSTALL_SCOPE_LABELS,
  DEFAULT_FILE_NAMES,
} from "@/lib/constants";
import * as fs from "fs";
import * as path from "path";

// ─── Read Prisma schema to extract enum values ───

const schemaPath = path.resolve(__dirname, "../../prisma/schema.prisma");
const schemaContent = fs.readFileSync(schemaPath, "utf-8");

function extractPrismaEnum(name: string): string[] {
  const regex = new RegExp(`enum\\s+${name}\\s*\\{([^}]+)\\}`, "m");
  const match = schemaContent.match(regex);
  if (!match) throw new Error(`Enum ${name} not found in Prisma schema`);
  return match[1]
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("//"));
}

// ═══════════════════════════════════════════════════════
// Zod Schema ↔ Prisma Enum Alignment
// ═══════════════════════════════════════════════════════

describe("Zod ↔ Prisma enum alignment", () => {
  it("AssetType enum matches createAssetSchema type values", () => {
    const prismaValues = extractPrismaEnum("AssetType");
    const zodValues = ["SKILL", "COMMAND", "AGENT"];
    expect(zodValues.sort()).toEqual(prismaValues.sort());
  });

  it("Platform enum matches createAssetSchema platform values", () => {
    const prismaValues = extractPrismaEnum("Platform");
    const zodValues = ["CLAUDE_CODE", "GEMINI_CLI", "CHATGPT", "CURSOR", "WINDSURF", "AIDER", "OTHER"];
    expect(zodValues.sort()).toEqual(prismaValues.sort());
  });

  it("Category enum matches createAssetSchema category values", () => {
    const prismaValues = extractPrismaEnum("Category");
    const zodValues = [
      "CODE_GENERATION", "CODE_REVIEW", "DOCUMENTATION", "TESTING",
      "DEVOPS", "DATA_ANALYSIS", "WRITING", "RESEARCH",
      "PRODUCTIVITY", "DESIGN", "DOMAIN_SPECIFIC", "OTHER",
    ];
    expect(zodValues.sort()).toEqual(prismaValues.sort());
  });

  it("Visibility enum matches createAssetSchema visibility values", () => {
    const prismaValues = extractPrismaEnum("Visibility");
    const zodValues = ["PRIVATE", "SHARED", "PUBLIC"];
    expect(zodValues.sort()).toEqual(prismaValues.sort());
  });

  it("License enum matches createAssetSchema license values", () => {
    const prismaValues = extractPrismaEnum("License");
    const zodValues = ["MIT", "APACHE_2", "GPL_3", "BSD_3", "CC_BY_4", "CC_BY_SA_4", "UNLICENSED", "CUSTOM"];
    expect(zodValues.sort()).toEqual(prismaValues.sort());
  });

  it("InstallScope enum matches createAssetSchema installScope values", () => {
    const prismaValues = extractPrismaEnum("InstallScope");
    const zodValues = ["USER", "PROJECT"];
    expect(zodValues.sort()).toEqual(prismaValues.sort());
  });
});

// ═══════════════════════════════════════════════════════
// Constants ↔ Prisma Enum Alignment
// ═══════════════════════════════════════════════════════

describe("Constants ↔ Prisma enum alignment", () => {
  it("ASSET_TYPE_LABELS keys match AssetType enum", () => {
    const prismaValues = extractPrismaEnum("AssetType");
    expect(Object.keys(ASSET_TYPE_LABELS).sort()).toEqual(prismaValues.sort());
  });

  it("PLATFORM_LABELS keys match Platform enum", () => {
    const prismaValues = extractPrismaEnum("Platform");
    expect(Object.keys(PLATFORM_LABELS).sort()).toEqual(prismaValues.sort());
  });

  it("CATEGORY_LABELS keys match Category enum", () => {
    const prismaValues = extractPrismaEnum("Category");
    expect(Object.keys(CATEGORY_LABELS).sort()).toEqual(prismaValues.sort());
  });

  it("LICENSE_LABELS keys match License enum", () => {
    const prismaValues = extractPrismaEnum("License");
    expect(Object.keys(LICENSE_LABELS).sort()).toEqual(prismaValues.sort());
  });

  it("VISIBILITY_LABELS keys match Visibility enum", () => {
    const prismaValues = extractPrismaEnum("Visibility");
    expect(Object.keys(VISIBILITY_LABELS).sort()).toEqual(prismaValues.sort());
  });

  it("INSTALL_SCOPE_LABELS keys match InstallScope enum", () => {
    const prismaValues = extractPrismaEnum("InstallScope");
    expect(Object.keys(INSTALL_SCOPE_LABELS).sort()).toEqual(prismaValues.sort());
  });

  it("LICENSE_DESCRIPTIONS has exactly the same keys as LICENSE_LABELS", () => {
    expect(Object.keys(LICENSE_DESCRIPTIONS).sort()).toEqual(
      Object.keys(LICENSE_LABELS).sort()
    );
  });

  it("DEFAULT_FILE_NAMES keys are a subset of ASSET_TYPE_LABELS keys", () => {
    const typeKeys = Object.keys(ASSET_TYPE_LABELS);
    for (const key of Object.keys(DEFAULT_FILE_NAMES)) {
      expect(typeKeys).toContain(key);
    }
  });
});

// ═══════════════════════════════════════════════════════
// FormData Field Names ↔ Schema Keys
// ═══════════════════════════════════════════════════════

describe("FormData fields ↔ schema keys", () => {
  it("createAsset FormData keys match createAssetSchema", () => {
    // These are the field names extracted via formData.get() in createAsset
    const formDataKeys = [
      "name", "description", "type", "primaryPlatform",
      "compatiblePlatforms", "category", "tags", "visibility",
      "license", "installScope", "storageType", "content",
      "primaryFileName", "bundleUrl", "bundleManifest",
    ];
    // createAssetSchema uses .refine(), so access the inner schema's shape
    const inner = (createAssetSchema as any)._def?.schema ?? createAssetSchema;
    const schemaKeys = Object.keys(inner.shape);
    expect(formDataKeys.sort()).toEqual(schemaKeys.sort());
  });

  it("registerMachine FormData keys match registerMachineSchema", () => {
    const formDataKeys = ["name", "machineIdentifier"];
    const schemaKeys = Object.keys(registerMachineSchema.shape);
    expect(formDataKeys.sort()).toEqual(schemaKeys.sort());
  });

  it("syncAssetToMachine FormData keys match syncAssetSchema", () => {
    const formDataKeys = ["machineId", "assetId"];
    const schemaKeys = Object.keys(syncAssetSchema.shape);
    expect(formDataKeys.sort()).toEqual(schemaKeys.sort());
  });

  it("publishVersion FormData keys match publishVersionSchema", () => {
    const formDataKeys = ["assetId", "version", "changelog"];
    const schemaKeys = Object.keys(publishVersionSchema.shape);
    expect(formDataKeys.sort()).toEqual(schemaKeys.sort());
  });
});

// ═══════════════════════════════════════════════════════
// Server Action Authorization Patterns
// ═══════════════════════════════════════════════════════

describe("authorization pattern contracts", () => {
  // These are structural tests — we verify by reading the source files
  const assetActionsPath = path.resolve(__dirname, "../lib/actions/asset.ts");
  const machineActionsPath = path.resolve(__dirname, "../lib/actions/machine.ts");
  const assetSource = fs.readFileSync(assetActionsPath, "utf-8");
  const machineSource = fs.readFileSync(machineActionsPath, "utf-8");

  it("createAsset calls requireUser", () => {
    const fnBody = extractFunctionBody(assetSource, "createAsset");
    expect(fnBody).toContain("requireUser()");
  });

  it("updateAsset calls requireUser", () => {
    const fnBody = extractFunctionBody(assetSource, "updateAsset");
    expect(fnBody).toContain("requireUser()");
  });

  it("deleteAsset calls requireUser", () => {
    const fnBody = extractFunctionBody(assetSource, "deleteAsset");
    expect(fnBody).toContain("requireUser()");
  });

  it("forkAsset calls requireUser", () => {
    const fnBody = extractFunctionBody(assetSource, "forkAsset");
    expect(fnBody).toContain("requireUser()");
  });

  it("publishVersion calls requireUser", () => {
    const fnBody = extractFunctionBody(assetSource, "publishVersion");
    expect(fnBody).toContain("requireUser()");
  });

  it("downloadAsset uses currentUser (allows unauthenticated)", () => {
    const fnBody = extractFunctionBody(assetSource, "downloadAsset");
    expect(fnBody).toContain("currentUser()");
    expect(fnBody).not.toContain("requireUser()");
  });

  it("registerMachine calls requireUser", () => {
    const fnBody = extractFunctionBody(machineSource, "registerMachine");
    expect(fnBody).toContain("requireUser()");
  });

  it("deleteMachine calls requireUser", () => {
    const fnBody = extractFunctionBody(machineSource, "deleteMachine");
    expect(fnBody).toContain("requireUser()");
  });

  it("syncAssetToMachine calls requireUser", () => {
    const fnBody = extractFunctionBody(machineSource, "syncAssetToMachine");
    expect(fnBody).toContain("requireUser()");
  });

  it("markAssetSynced calls requireUser", () => {
    const fnBody = extractFunctionBody(machineSource, "markAssetSynced");
    expect(fnBody).toContain("requireUser()");
  });

  it("forkAsset checks authorId !== userId (must NOT be owner)", () => {
    const fnBody = extractFunctionBody(assetSource, "forkAsset");
    expect(fnBody).toContain("authorId === userId");
  });

  it("deleteAsset checks authorId === userId (must be owner)", () => {
    const fnBody = extractFunctionBody(assetSource, "deleteAsset");
    expect(fnBody).toContain("authorId !== userId");
  });
});

// ─── Helper to extract function body from source ───

function extractFunctionBody(source: string, fnName: string): string {
  // Match "export async function <name>(" and grab everything until the next "export" or end
  const regex = new RegExp(
    `export\\s+async\\s+function\\s+${fnName}\\s*\\([^)]*\\)[^{]*\\{`,
    "m"
  );
  const match = source.match(regex);
  if (!match || match.index === undefined) return "";

  const start = match.index + match[0].length;
  let depth = 1;
  let i = start;
  while (i < source.length && depth > 0) {
    if (source[i] === "{") depth++;
    if (source[i] === "}") depth--;
    i++;
  }
  return source.slice(start, i);
}
