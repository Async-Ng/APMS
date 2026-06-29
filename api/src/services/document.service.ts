import type { Types } from "mongoose";

import { isAllowedMimeType } from "../constants/upload";
import { createAppError, ErrorCode } from "../errors/error-codes";
import { getEnv } from "../config/aws";
import {
  Document,
  toDocumentResponse,
  type DocumentDocument,
} from "../models/document.model";
import { Folder } from "../models/folder.model";
import { User, type UserDocument } from "../models/user.model";
import { parseObjectId } from "../utils/objectId";
import { processDocument } from "./processing.service";
import * as s3Service from "./s3.service";
import { findReadableDocument } from "./share.service";
import { assertUserCanUseCourseSlot } from "./academic.service";

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
    throw createAppError(ErrorCode.DOCUMENT_NOT_FOUND, 404);
  }

  return document;
}

async function findDocumentIncludingTrash(
  documentId: Types.ObjectId,
  ownerId: Types.ObjectId,
): Promise<DocumentDocument> {
  const document = await Document.findOne({ _id: documentId, ownerId });

  if (!document) {
    throw createAppError(ErrorCode.DOCUMENT_NOT_FOUND, 404);
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
    throw createAppError(ErrorCode.FOLDER_NOT_FOUND, 404);
  }
}

function assertQuota(user: UserDocument, additionalBytes: number): void {
  const env = getEnv();
  const maxBytes = Math.min(env.MAX_UPLOAD_BYTES, user.storageQuotaBytes - user.storageUsedBytes);

  if (additionalBytes > maxBytes) {
    throw createAppError(ErrorCode.STORAGE_QUOTA, 403);
  }

  if (additionalBytes > env.MAX_UPLOAD_BYTES) {
    throw createAppError(ErrorCode.UPLOAD_TOO_LARGE, 400, {
      technicalDetail: `maxBytes=${env.MAX_UPLOAD_BYTES}`,
    });
  }
}

export async function createUploadIntent(
  user: UserDocument,
  input: {
    originalFilename: string;
    mimeType: string;
    fileSizeBytes: number;
    courseSlotId: string;
    visibility: "private" | "public";
    folderId?: string | null;
    title?: string;
  },
) {
  if (!isAllowedMimeType(input.mimeType)) {
    throw createAppError(ErrorCode.UNSUPPORTED_FILE, 400);
  }

  assertQuota(user, input.fileSizeBytes);

  const folderId = input.folderId ? parseObjectId(input.folderId, "folderId") : null;
  await assertFolderValid(folderId, user._id);
  const courseSlot = await assertUserCanUseCourseSlot(
    user,
    input.courseSlotId,
  );

  const s3Key = s3Service.buildS3Key(user._id.toString(), input.originalFilename);
  const title = input.title ?? input.originalFilename;

  const document = await Document.create({
    ownerId: user._id,
    folderId,
    courseSlotId: courseSlot._id,
    visibility: input.visibility,
    title,
    originalFilename: input.originalFilename,
    mimeType: input.mimeType,
    s3Key,
    fileSizeBytes: input.fileSizeBytes,
    status: "pending",
  });

  const { uploadUrl, expiresIn } = await s3Service.createPresignedPutUrl(s3Key);

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
    throw createAppError(ErrorCode.DOCUMENT_NOT_FOUND, 404);
  }

  if (document.status !== "pending") {
    throw createAppError(ErrorCode.UPLOAD_ALREADY_COMPLETED, 400);
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
    throw createAppError(ErrorCode.USER_NOT_FOUND, 404);
  }

  if (updatedUser.storageUsedBytes > updatedUser.storageQuotaBytes) {
    await User.findByIdAndUpdate(user._id, {
      $inc: { storageUsedBytes: -document.fileSizeBytes },
    });
    throw createAppError(ErrorCode.STORAGE_QUOTA, 403);
  }

  document.status = "processing";
  await document.save();

  void processDocument(document._id).catch((err) => {
    console.error(
      `[processing] Immediate enqueue failed for ${document._id.toString()}:`,
      err,
    );
  });

  return toDocumentResponse(document);
}

export async function getDocument(
  user: UserDocument,
  documentId: string,
  options?: { includeDownloadUrl?: boolean },
) {
  const document = await findReadableDocument(user._id, parseObjectId(documentId));

  const extras: { downloadUrl?: string } = {};
  if (options?.includeDownloadUrl && document.status !== "pending") {
    extras.downloadUrl = await s3Service.createPresignedGetUrl(document.s3Key);
  }

  return toDocumentResponse(document, extras);
}

export async function updateDocument(
  user: UserDocument,
  documentId: string,
  input: {
    title?: string;
    tags?: string[];
    folderId?: string | null;
    courseSlotId?: string;
    visibility?: "private" | "public";
  },
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

  if (input.courseSlotId !== undefined) {
    const courseSlot = await assertUserCanUseCourseSlot(
      user,
      input.courseSlotId,
    );
    document.courseSlotId = courseSlot._id;
  }

  if (input.visibility !== undefined) {
    if (!document.courseSlotId) {
      throw createAppError(ErrorCode.VALIDATION_ERROR, 400, {
        technicalDetail: "courseSlotId is required before changing visibility",
      });
    }
    document.visibility = input.visibility;
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
    throw createAppError(ErrorCode.DOCUMENT_NOT_IN_TRASH, 400);
  }

  if (document.folderId) {
    const folder = await Folder.findOne({
      _id: document.folderId,
      ownerId: user._id,
    });

    if (!folder || folder.deletedAt) {
      throw createAppError(ErrorCode.RESTORE_PARENT_FIRST, 400);
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
