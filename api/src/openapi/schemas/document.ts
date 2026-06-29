import {
  DOCUMENT_STATUSES,
  DOCUMENT_VISIBILITIES,
} from "../../models/document.model";
import { registry, z } from "../setup";
import { successEnvelope } from "./common";

export const documentSchema = registry.register(
  "Document",
  z
    .object({
      id: z.string(),
      ownerId: z.string(),
      folderId: z.string().nullable(),
      courseSlotId: z.string().nullable(),
      visibility: z.enum(DOCUMENT_VISIBILITIES),
      title: z.string(),
      originalFilename: z.string(),
      mimeType: z.string(),
      s3Key: z.string(),
      fileSizeBytes: z.number(),
      status: z.enum(DOCUMENT_STATUSES),
      pageCount: z.number().nullable(),
      tags: z.array(z.string()),
      isStarred: z.boolean(),
      deletedAt: z.coerce.date().nullable(),
      permanentDeleteAt: z.coerce.date().nullable().optional(),
      createdAt: z.coerce.date(),
      updatedAt: z.coerce.date(),
      downloadUrl: z.string().optional(),
    })
    .openapi("Document"),
);

export const documentListItemSchema = registry.register(
  "DocumentListItem",
  documentSchema.extend({
    source: z.enum(["owned", "shared", "public"]),
    owner: z
      .object({
        id: z.string(),
        displayName: z.string(),
        email: z.string(),
        avatarUrl: z.string().nullable(),
      })
      .nullable(),
    courseSlot: z
      .object({
        id: z.string(),
        semesterId: z.string(),
        semester: z.record(z.string(), z.unknown()).nullable(),
        curriculum: z.record(z.string(), z.unknown()).nullable(),
        subject: z.record(z.string(), z.unknown()).nullable(),
      })
      .nullable(),
    share: z.record(z.string(), z.unknown()).nullable(),
    matchType: z
      .enum(["exact_course", "same_subject_other_semester", "global_public"])
      .nullable(),
  }),
);

export const documentListSuccessResponseSchema = successEnvelope(
  z.object({
    folders: z.array(z.record(z.string(), z.unknown())),
    documents: z.array(documentListItemSchema),
    pagination: z
      .object({
        page: z.number(),
        limit: z.number(),
        total: z.number(),
        totalPages: z.number(),
      })
      .optional(),
  }),
  "DocumentList",
);

export const documentSuccessResponseSchema = successEnvelope(documentSchema, "Document");

export const uploadIntentDataSchema = z.object({
  document: documentSchema,
  uploadUrl: z.string().url(),
  s3Key: z.string(),
  expiresIn: z.number().int(),
});

export const uploadIntentSuccessResponseSchema = successEnvelope(
  uploadIntentDataSchema,
  "UploadIntent",
);
