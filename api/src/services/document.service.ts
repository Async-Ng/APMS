import type { Types } from "mongoose";

import { isAllowedMimeType } from "../constants/upload";
import { AppError } from "../errors/AppError";
import { getEnv } from "../config/aws";
import {
  Document,
  toDocumentResponse,
  type DocumentDocument,
} from "../models/document.model";
import { Folder } from "../models/folder.model";
import { User, type UserDocument } from "../models/user.model";
import { parseObjectId } from "../utils/objectId";
import * as s3Service from "./s3.service";
import { checkShareAccess } from "./share.service";

async function findAccessibleActiveDocument(
  documentId: Types.ObjectId,
  user: UserDocument,
): Promise<DocumentDocument> {
  const owned = await Document.findOne({
    _id: documentId,
    ownerId: user._id,
    deletedAt: null,
  });
  if (owned) return owned;

  const hasAccess = await checkShareAccess(user._id, "document", documentId);
  if (!hasAccess) {
    throw new AppError("Document not found", 404);
  }

  const document = await Document.findOne({ _id: documentId, deletedAt: null });
  if (!document) {
    throw new AppError("Document not found", 404);
  }

  return document;
}

async function findActiveDocument(
  documentId: Types.ObjectId,
  ownerId: Types.ObjectId,
): Promise<DocumentDocument> {
  const document = await Document.findOne({
    _id: documentId,
    ownerId,
    deletedAt: null,
  });

  if (!document) {
    throw new AppError("Document not found", 404);
  }

  return document;
}

async function findDocumentIncludingTrash(
  documentId: Types.ObjectId,
  ownerId: Types.ObjectId,
): Promise<DocumentDocument> {
  const document = await Document.findOne({ _id: documentId, ownerId });

  if (!document) {
    throw new AppError("Document not found", 404);
  }

  return document;
}

async function assertFolderValid(
  folderId: Types.ObjectId | null,
  ownerId: Types.ObjectId,
): Promise<void> {
  if (!folderId) {
    return;
  }

  const folder = await Folder.findOne({
    _id: folderId,
    ownerId,
    deletedAt: null,
  });

  if (!folder) {
    throw new AppError("Folder not found", 404);
  }
}

function assertQuota(user: UserDocument, additionalBytes: number): void {
  const env = getEnv();
  const maxBytes = Math.min(env.MAX_UPLOAD_BYTES, user.storageQuotaBytes - user.storageUsedBytes);

  if (additionalBytes > maxBytes) {
    throw new AppError("Storage quota exceeded", 403);
  }

  if (additionalBytes > env.MAX_UPLOAD_BYTES) {
    throw new AppError(`File exceeds maximum upload size of ${env.MAX_UPLOAD_BYTES} bytes`, 400);
  }
}

export async function createUploadIntent(
  user: UserDocument,
  input: {
    originalFilename: string;
    mimeType: string;
    fileSizeBytes: number;
    folderId?: string | null;
    title?: string;
  },
) {
  if (!isAllowedMimeType(input.mimeType)) {
    throw new AppError("Unsupported file type", 400);
  }

  assertQuota(user, input.fileSizeBytes);

  const folderId = input.folderId ? parseObjectId(input.folderId, "folderId") : null;
  await assertFolderValid(folderId, user._id);

  const s3Key = s3Service.buildS3Key(user._id.toString(), input.originalFilename);
  const title = input.title ?? input.originalFilename;

  const document = await Document.create({
    ownerId: user._id,
    folderId,
    title,
    originalFilename: input.originalFilename,
    mimeType: input.mimeType,
    s3Key,
    fileSizeBytes: input.fileSizeBytes,
    status: "pending",
  });

  const { uploadUrl, expiresIn } = await s3Service.createPresignedPutUrl(
    s3Key,
    input.mimeType,
    input.fileSizeBytes,
  );

  return {
    document: toDocumentResponse(document),
    uploadUrl,
    s3Key,
    expiresIn,
  };
}

export async function completeUpload(user: UserDocument, documentId: string) {
  const id = parseObjectId(documentId);
  const document = await Document.findOne({
    _id: id,
    ownerId: user._id,
    deletedAt: null,
  });

  if (!document) {
    throw new AppError("Document not found", 404);
  }

  if (document.status !== "pending") {
    throw new AppError("Document upload already completed or failed", 400);
  }

  await s3Service.verifyUploadedObject(
    document.s3Key,
    document.fileSizeBytes,
    document.mimeType,
  );

  assertQuota(user, document.fileSizeBytes);

  const updatedUser = await User.findOneAndUpdate(
    { _id: user._id },
    { $inc: { storageUsedBytes: document.fileSizeBytes } },
    { returnDocument: "after" },
  );

  if (!updatedUser) {
    throw new AppError("User not found", 404);
  }

  if (updatedUser.storageUsedBytes > updatedUser.storageQuotaBytes) {
    await User.findByIdAndUpdate(user._id, {
      $inc: { storageUsedBytes: -document.fileSizeBytes },
    });
    throw new AppError("Storage quota exceeded", 403);
  }

  document.status = "processing";
  await document.save();

  return toDocumentResponse(document);
}

export async function getDocument(
  user: UserDocument,
  documentId: string,
  options?: { includeDownloadUrl?: boolean },
) {
  const document = await findAccessibleActiveDocument(
    parseObjectId(documentId),
    user,
  );

  const extras: { downloadUrl?: string } = {};
  if (options?.includeDownloadUrl && document.status !== "pending") {
    extras.downloadUrl = await s3Service.createPresignedGetUrl(document.s3Key);
  }

  return toDocumentResponse(document, extras);
}

export async function updateDocument(
  user: UserDocument,
  documentId: string,
  input: { title?: string; tags?: string[]; folderId?: string | null },
) {
  const document = await findActiveDocument(parseObjectId(documentId), user._id);

  if (input.folderId !== undefined) {
    const newFolderId = input.folderId ? parseObjectId(input.folderId, "folderId") : null;
    await assertFolderValid(newFolderId, user._id);
    document.folderId = newFolderId;
  }

  if (input.title !== undefined) {
    document.title = input.title;
  }

  if (input.tags !== undefined) {
    document.tags = input.tags;
  }

  await document.save();
  return toDocumentResponse(document);
}

export async function deleteDocument(user: UserDocument, documentId: string) {
  const document = await findActiveDocument(parseObjectId(documentId), user._id);
  document.deletedAt = new Date();
  await document.save();
  return toDocumentResponse(document);
}

export async function restoreDocument(user: UserDocument, documentId: string) {
  const document = await findDocumentIncludingTrash(parseObjectId(documentId), user._id);

  if (!document.deletedAt) {
    throw new AppError("Document is not in trash", 400);
  }

  if (document.folderId) {
    const folder = await Folder.findOne({
      _id: document.folderId,
      ownerId: user._id,
    });

    if (!folder || folder.deletedAt) {
      throw new AppError("Restore the parent folder first", 400);
    }
  }

  document.deletedAt = null;
  await document.save();
  return toDocumentResponse(document);
}

export async function setDocumentStarred(
  user: UserDocument,
  documentId: string,
  isStarred: boolean,
) {
  const document = await findActiveDocument(parseObjectId(documentId), user._id);
  document.isStarred = isStarred;
  await document.save();
  return toDocumentResponse(document);
}
