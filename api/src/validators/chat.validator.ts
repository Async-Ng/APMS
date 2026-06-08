import { z } from "zod";

const objectIdRegex = /^[a-f\d]{24}$/i;
const objectIdSchema = z.string().regex(objectIdRegex, "Invalid ObjectId");

export const createSessionSchema = z
  .object({
    title: z.string().trim().min(1).max(255).optional(),
    contextType: z.enum(["all", "folder", "document", "documents"]).default("all"),
    contextId: objectIdSchema.optional(),
    contextIds: z.array(objectIdSchema).min(1).max(20).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.contextType === "folder" || data.contextType === "document") {
      if (!data.contextId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "contextId is required when contextType is folder or document",
          path: ["contextId"],
        });
      }
    }
    if (data.contextType === "documents") {
      if (!data.contextIds || data.contextIds.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "contextIds is required when contextType is documents",
          path: ["contextIds"],
        });
      }
    }
  });

export const updateSessionSchema = z.object({
  title: z.string().trim().min(1).max(255),
});

export const sendMessageSchema = z.object({
  content: z.string().trim().min(1).max(10_000),
});
