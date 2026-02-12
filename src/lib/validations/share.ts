import { z } from "zod";

export const shareAssetSchema = z.object({
  assetId: z.string().min(1, "Asset ID is required"),
  email: z
    .string()
    .email("Invalid email address")
    .transform((s) => s.toLowerCase()),
});

export const revokeShareSchema = z.object({
  shareId: z.string().min(1, "Share ID is required"),
});
