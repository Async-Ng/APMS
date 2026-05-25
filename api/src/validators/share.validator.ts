import { z } from "zod";

const objectIdRegex = /^[a-f\d]{24}$/i;
const objectIdSchema = z.string().regex(objectIdRegex, "Invalid ObjectId");

export const createShareSchema = z.object({
  resourceType: z.enum(["folder", "document"]),
  resourceId: objectIdSchema,
  sharedWithUserIds: z
    .array(objectIdSchema)
    .min(1, "At least one recipient is required")
    .max(50, "Cannot share with more than 50 users at once"),
});

export const userSearchQuerySchema = z.object({
  email: z.string().email("Invalid email format").optional(),
  displayName: z.string().min(1).optional(),
}).refine(
  (data) => data.email !== undefined || data.displayName !== undefined,
  { message: "Provide at least 'email' or 'displayName' to search" },
);
