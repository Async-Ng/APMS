import { z } from "zod";

export const forumDocumentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(255).optional(),
  sort: z.enum(["newest", "oldest", "title"]).default("newest"),
});
