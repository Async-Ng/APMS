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

export const listAccessEmailsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(320).optional(),
  status: z.enum(["active", "inactive", "all"]).default("all"),
});

export const bulkAccessEmailsSchema = z.object({
  entries: z
    .array(
      z.object({
        // Syntax and length are evaluated per entry so one bad email does not reject the batch.
        email: z.string(),
        note: z.string().trim().max(500).optional(),
      }),
    )
    .min(1)
    .max(500),
});

export const updateAccessEmailSchema = z
  .object({
    note: z.string().trim().max(500).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => data.note !== undefined || data.isActive !== undefined, {
    message: "At least one field must be provided",
  });
