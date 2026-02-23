import { z } from "zod";

export const createApiKeySchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  machineId: z.string().optional(),
  expiresInDays: z.coerce
    .number()
    .int()
    .min(1, "Minimum 1 day")
    .max(365, "Maximum 365 days")
    .optional(),
});

export const revokeApiKeySchema = z.object({
  keyId: z.string().min(1, "Key ID is required"),
});
