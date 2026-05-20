import { z } from "zod";

export const objectIdParamSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid id"),
});

export const optionalParentIdQuerySchema = z.object({
  parentId: z
    .union([z.string().regex(/^[a-f\d]{24}$/i), z.literal("null"), z.literal("")])
    .optional(),
});
