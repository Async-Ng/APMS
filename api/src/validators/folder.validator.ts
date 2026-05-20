import { z } from "zod";

export const createFolderSchema = z.object({
  name: z.string().trim().min(1).max(255),
  parentId: z.string().regex(/^[a-f\d]{24}$/i).nullable().optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
});

export const updateFolderSchema = z
  .object({
    name: z.string().trim().min(1).max(255).optional(),
    parentId: z
      .union([z.string().regex(/^[a-f\d]{24}$/i), z.null()])
      .optional(),
    color: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/)
      .optional(),
  })
  .refine((data) => data.name !== undefined || data.parentId !== undefined || data.color !== undefined, {
    message: "At least one field must be provided",
  });
