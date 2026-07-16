import { z } from "zod";

import { ALLOWED_MIME_TYPES } from "../constants/upload";
import { DOCUMENT_VISIBILITIES } from "../models/document.model";

export const createUploadIntentSchema = z.object({
  originalFilename: z.string().trim().min(1).max(255),
  mimeType: z.enum(ALLOWED_MIME_TYPES),
  fileSizeBytes: z.number().int().positive(),
  courseSlotId: z.string().regex(/^[a-f\d]{24}$/i),
  visibility: z.enum(DOCUMENT_VISIBILITIES).default("private"),
  folderId: z.string().regex(/^[a-f\d]{24}$/i).nullable().optional(),
  title: z.string().trim().min(1).max(255).optional(),
});

export const listDocumentsQuerySchema = z.object({
  view: z.enum(["my", "shared", "public", "starred", "trash"]).default("my"),
  parentId: z.string().regex(/^[a-f\d]{24}$/i).nullable().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(255).optional(),
  sort: z.enum(["newest", "oldest", "title"]).default("newest"),
  curriculumId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  semesterId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  subjectId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  ownerId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  match: z.enum(["auto", "exact", "related", "all"]).default("auto"),
});

export const citationContextQuerySchema = z.object({
  chunkIndex: z.coerce.number().int().min(0),
});

export const updateDocumentSchema = z
  .object({
    title: z.string().trim().min(1).max(255).optional(),
    tags: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
    folderId: z
      .union([z.string().regex(/^[a-f\d]{24}$/i), z.null()])
      .optional(),
    courseSlotId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
    visibility: z.enum(DOCUMENT_VISIBILITIES).optional(),
  })
  .refine(
    (data) =>
      data.title !== undefined ||
      data.tags !== undefined ||
      data.folderId !== undefined ||
      data.courseSlotId !== undefined ||
      data.visibility !== undefined,
    { message: "At least one field must be provided" },
  );
