import { z } from "zod";

const objectIdRegex = /^[a-f\d]{24}$/i;

export const createSessionSchema = z
  .object({
    title: z.string().trim().min(1).max(255).optional(),
    contextType: z.enum(["all", "folder", "document"]).default("all"),
    contextId: z.string().regex(objectIdRegex).optional(),
  })
  .refine(
    (data) => data.contextType === "all" || data.contextId !== undefined,
    { message: "contextId is required when contextType is 'folder' or 'document'" },
  );

export const sendMessageSchema = z.object({
  content: z.string().trim().min(1).max(10_000),
});
