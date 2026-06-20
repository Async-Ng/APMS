import { z } from "zod";

import { ALLOWED_MIME_TYPES } from "../constants/upload";

export const createUploadIntentSchema = z.object({
  originalFilename: z.string().trim().min(1).max(255),
  mimeType: z.enum(ALLOWED_MIME_TYPES),
  fileSizeBytes: z.number().int().positive(),
  curriculumCourseId: z.string().regex(/^[a-f\d]{24}$/i),
  folderId: z.string().regex(/^[a-f\d]{24}$/i).nullable().optional(),
  title: z.string().trim().min(1).max(255).optional(),
});

export const updateDocumentSchema = z
  .object({
    title: z.string().trim().min(1).max(255).optional(),
    tags: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
    folderId: z
      .union([z.string().regex(/^[a-f\d]{24}$/i), z.null()])
      .optional(),
    curriculumCourseId: z
      .union([z.string().regex(/^[a-f\d]{24}$/i), z.null()])
      .optional(),
  })
  .refine(
    (data) =>
      data.title !== undefined ||
      data.tags !== undefined ||
      data.folderId !== undefined ||
      data.curriculumCourseId !== undefined,
    { message: "At least one field must be provided" },
  );
