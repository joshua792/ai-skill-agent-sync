import { z } from "zod";

const assetTypeValues = ["SKILL", "COMMAND", "AGENT"] as const;
const platformValues = ["CLAUDE_CODE", "GEMINI_CLI", "CHATGPT", "CURSOR", "WINDSURF", "AIDER", "OTHER"] as const;
const categoryValues = ["CODE_GENERATION", "CODE_REVIEW", "DOCUMENTATION", "TESTING", "DEVOPS", "DATA_ANALYSIS", "WRITING", "RESEARCH", "PRODUCTIVITY", "DESIGN", "DOMAIN_SPECIFIC", "OTHER"] as const;
const visibilityValues = ["PRIVATE", "SHARED", "PUBLIC"] as const;
const licenseValues = ["MIT", "APACHE_2", "GPL_3", "BSD_3", "CC_BY_4", "CC_BY_SA_4", "UNLICENSED", "CUSTOM"] as const;
const installScopeValues = ["USER", "PROJECT"] as const;

export const createAssetSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name must be under 100 characters"),
  description: z.string().min(10, "Description must be at least 10 characters").max(280, "Description must be under 280 characters"),
  type: z.enum(assetTypeValues),
  primaryPlatform: z.enum(platformValues),
  compatiblePlatforms: z.array(z.enum(platformValues)).default([]),
  category: z.enum(categoryValues),
  tags: z.string().transform((val) => val.split(",").map((t) => t.trim()).filter(Boolean)),
  visibility: z.enum(visibilityValues).default("PRIVATE"),
  license: z.enum(licenseValues).default("UNLICENSED"),
  installScope: z.enum(installScopeValues).default("PROJECT"),
  content: z.string().min(1, "Content is required"),
  primaryFileName: z.string().min(1, "File name is required").max(255),
});

export const updateAssetSchema = createAssetSchema.partial();

export const publishVersionSchema = z.object({
  assetId: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, "Version must be semver format (e.g. 1.2.3)"),
  changelog: z.string().min(1, "Changelog is required").max(2000),
});

export type CreateAssetInput = z.input<typeof createAssetSchema>;
export type UpdateAssetInput = z.input<typeof updateAssetSchema>;
export type PublishVersionInput = z.input<typeof publishVersionSchema>;
