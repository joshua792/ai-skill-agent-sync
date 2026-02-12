import { z } from "zod";

export const updateProfileSchema = z.object({
  displayName: z
    .string()
    .max(100, "Display name must be under 100 characters")
    .optional()
    .or(z.literal("")),
  bio: z
    .string()
    .max(280, "Bio must be under 280 characters")
    .optional()
    .or(z.literal("")),
});
