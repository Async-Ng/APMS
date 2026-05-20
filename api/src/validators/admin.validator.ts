import { z } from "zod";

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
});

export const updateAdminUserSchema = z
  .object({
    storageQuotaBytes: z.number().int().positive().optional(),
    isDisabled: z.boolean().optional(),
  })
  .refine(
    (data) => data.storageQuotaBytes !== undefined || data.isDisabled !== undefined,
    { message: "At least one field must be provided" },
  );
