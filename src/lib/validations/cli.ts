import { z } from "zod";

export const syncManifestQuerySchema = z.object({
  machineId: z.string().min(1, "machineId is required"),
});

export const assetContentPutSchema = z.object({
  content: z.string().min(1, "Content is required"),
  localHash: z.string().min(1, "localHash is required"),
  machineId: z.string().min(1, "machineId is required"),
});

export const cliMachineRegisterSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  machineIdentifier: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z0-9_-]+$/, "Only letters, numbers, hyphens, and underscores"),
});

export const cliSyncReportSchema = z.object({
  machineId: z.string().min(1, "machineId is required"),
  assetId: z.string().min(1, "assetId is required"),
  syncedVersion: z.string().min(1, "syncedVersion is required"),
  localHash: z.string().optional(),
  installPath: z.string().max(1024).optional(),
  direction: z.enum(["push", "pull"]),
});
