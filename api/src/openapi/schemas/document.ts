import { DOCUMENT_STATUSES } from "../../models/document.model";
import { registry, z } from "../setup";
import { successEnvelope } from "./common";

export const documentSchema = registry.register(
  "Document",
  z
    .object({
      id: z.string(),
      ownerId: z.string(),
      folderId: z.string().nullable(),
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
      createdAt: z.coerce.date(),
      updatedAt: z.coerce.date(),
      downloadUrl: z.string().optional(),
    })
    .openapi("Document"),
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
