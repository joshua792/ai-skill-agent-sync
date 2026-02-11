import { z } from "zod";

export const registerMachineSchema = z.object({
  name: z
    .string()
    .min(1, "Machine name is required")
    .max(100, "Name must be under 100 characters"),
  machineIdentifier: z
    .string()
    .min(1, "Machine identifier is required")
    .max(100, "Identifier must be under 100 characters")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Identifier must only contain letters, numbers, hyphens, and underscores"
    ),
});

export const syncAssetSchema = z.object({
  machineId: z.string().min(1, "Machine ID is required"),
  assetId: z.string().min(1, "Asset ID is required"),
});
