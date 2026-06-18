import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

export const DOCUMENT_STATUSES = ["pending", "processing", "ready", "failed"] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export const MAX_PROCESSING_ATTEMPTS = 5;

const documentSchema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    folderId: { type: Schema.Types.ObjectId, ref: "Folder", default: null },
    title: { type: String, required: true, trim: true, maxlength: 255 },
    originalFilename: { type: String, required: true },
    mimeType: { type: String, required: true },
    s3Key: { type: String, required: true, unique: true },
    fileSizeBytes: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: DOCUMENT_STATUSES,
      required: true,
      default: "pending",
    },
    pageCount: { type: Number },
    processingAttempts: { type: Number, default: 0 },
    lastError: { type: String, default: null },
    tags: { type: [String], default: [] },
    isStarred: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

documentSchema.index({ ownerId: 1, folderId: 1 });
documentSchema.index({ ownerId: 1, deletedAt: 1 });
documentSchema.index({ ownerId: 1, isStarred: 1 });
documentSchema.index({ status: 1 });

export type DocumentDocument = HydratedDocument<InferSchemaType<typeof documentSchema>>;

export const Document = model("Document", documentSchema);

export function toDocumentResponse(document: DocumentDocument, extras?: { downloadUrl?: string }) {
  return {
    id: document._id.toString(),
    ownerId: document.ownerId.toString(),
    folderId: document.folderId ? document.folderId.toString() : null,
    title: document.title,
    originalFilename: document.originalFilename,
    mimeType: document.mimeType,
    s3Key: document.s3Key,
    fileSizeBytes: document.fileSizeBytes,
    status: document.status,
    pageCount: document.pageCount ?? null,
    tags: document.tags,
    isStarred: document.isStarred,
    deletedAt: document.deletedAt ?? null,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
    ...extras,
  };
}
