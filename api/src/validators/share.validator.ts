import { z } from "zod";

const objectIdRegex = /^[a-f\d]{24}$/i;
const objectIdSchema = z.string().regex(objectIdRegex, "Invalid ObjectId");

export const createShareSchema = z
  .object({
    resourceType: z.enum(["folder", "document"]),
    resourceId: objectIdSchema,
    sharedWithUserIds: z
      .array(objectIdSchema)
      .max(50, "Cannot share with more than 50 users at once")
      .default([]),
    emails: z
      .array(z.string().email("Invalid email format"))
      .max(50, "Cannot share with more than 50 emails at once")
      .default([]),
  })
  .refine((data) => data.sharedWithUserIds.length + data.emails.length >= 1, {
    message: "At least one recipient is required",
  });

export const userSearchQuerySchema = z.object({
  email: z.string().email("Invalid email format").optional(),
  displayName: z.string().min(1).optional(),
}).refine(
  (data) => data.email !== undefined || data.displayName !== undefined,
  { message: "Provide at least 'email' or 'displayName' to search" },
);
