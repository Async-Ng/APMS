import { registry, z } from "../setup";
import { DOCUMENT_STATUSES, DOCUMENT_VISIBILITIES } from "../../models/document.model";
import { successEnvelope } from "./common";
import { FORUM_MATCH_TYPES } from "../../services/forum.service";

const forumMajorSchema = z
  .object({
    id: z.string(),
    code: z.string(),
    name: z.string(),
  })
  .nullable();

const forumSubjectSchema = z
  .object({
    id: z.string(),
    code: z.string(),
    name: z.string(),
  })
  .nullable();

const forumCurriculumSchema = z
  .object({
    id: z.string(),
    semesterNumber: z.number().int().min(1).max(9),
    major: forumMajorSchema,
    subject: forumSubjectSchema,
  })
  .nullable();

export const forumDocumentSchema = registry.register(
  "ForumDocument",
  z
    .object({
      id: z.string(),
      title: z.string(),
      originalFilename: z.string(),
      mimeType: z.string(),
      fileSizeBytes: z.number(),
      status: z.enum(DOCUMENT_STATUSES),
      pageCount: z.number().nullable(),
      tags: z.array(z.string()),
      visibility: z.enum(DOCUMENT_VISIBILITIES),
      matchType: z.enum(FORUM_MATCH_TYPES),
      curriculumCourse: forumCurriculumSchema,
      owner: z
        .object({
          id: z.string(),
          displayName: z.string(),
          avatarUrl: z.string().nullable(),
        })
        .nullable(),
      createdAt: z.coerce.date(),
      updatedAt: z.coerce.date(),
      downloadUrl: z.string().url().optional(),
    })
    .openapi("ForumDocument"),
);

export const forumPaginationSchema = registry.register(
  "ForumPagination",
  z
    .object({
      page: z.number().int(),
      limit: z.number().int(),
      total: z.number().int(),
      totalPages: z.number().int(),
    })
    .openapi("ForumPagination"),
);

export const forumDocumentsDataSchema = registry.register(
  "ForumDocumentsData",
  z
    .object({
      documents: z.array(forumDocumentSchema),
      pagination: forumPaginationSchema,
    })
    .openapi("ForumDocumentsData"),
);

export const forumDocumentsSuccessResponseSchema = successEnvelope(
  forumDocumentsDataSchema,
  "ForumDocuments",
);

export const forumDocumentSuccessResponseSchema = successEnvelope(
  forumDocumentSchema,
  "ForumDocument",
);
