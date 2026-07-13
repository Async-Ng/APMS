import type { Types } from "mongoose";

import { getEnv } from "../config/aws";
import { createAppError, ErrorCode } from "../errors/error-codes";
import { DocumentChunk } from "../models/document-chunk.model";
import { Document, type DocumentDocument } from "../models/document.model";
import { Folder, type FolderDocument } from "../models/folder.model";
import { User, type UserDocument } from "../models/user.model";
import { parseObjectId } from "../utils/objectId";
import { revokeSharesByResource } from "./share.service";
import * as s3Service from "./s3.service";

const MS_PER_DAY = 86_400_000;

export function getTrashRetentionDays(): number {
  return getEnv().TRASH_RETENTION_DAYS;
}

export function computePermanentDeleteAt(deletedAt: Date): Date {
  return new Date(deletedAt.getTime() + getTrashRetentionDays() * MS_PER_DAY);
}

async function decrementStorageQuota(ownerId: Types.ObjectId, fileSizeBytes: number): Promise<void> {
  const updated = await User.findByIdAndUpdate(
    ownerId,
    { $inc: { storageUsedBytes: -fileSizeBytes } },
    { returnDocument: "after" },
  );

  if (updated && updated.storageUsedBytes < 0) {
    await User.findByIdAndUpdate(ownerId, { $set: { storageUsedBytes: 0 } });
  }
}

export async function permanentlyDeleteDocument(document: DocumentDocument): Promise<void> {
  const documentId = document._id;
  const ownerId = document.ownerId;

  await DocumentChunk.deleteMany({ documentId });
  await revokeSharesByResource(ownerId, "document", documentId);
  await s3Service.deleteObject(document.s3Key);

  if (document.status !== "pending") {
    await decrementStorageQuota(ownerId, document.fileSizeBytes);
  }

  await Document.deleteOne({ _id: documentId });
}

async function collectDescendantFolderIds(
  rootId: Types.ObjectId,
  ownerId: Types.ObjectId,
): Promise<Types.ObjectId[]> {
  const folderIds: Types.ObjectId[] = [rootId];
  const queue: Types.ObjectId[] = [rootId];

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (!currentId) {
      continue;
    }

    const children = await Folder.find({
      ownerId,
      parentId: currentId,
    }).select("_id");

    for (const child of children) {
      folderIds.push(child._id);
      queue.push(child._id);
    }
  }

  return folderIds;
}

export async function permanentlyDeleteFolder(folder: FolderDocument): Promise<void> {
  const ownerId = folder.ownerId;
  const folderIds = await collectDescendantFolderIds(folder._id, ownerId);

  const documents = await Document.find({
    ownerId,
    folderId: { $in: folderIds },
    deletedAt: { $ne: null },
  });

  for (const doc of documents) {
    await permanentlyDeleteDocument(doc);
  }

  for (const folderId of folderIds) {
    await revokeSharesByResource(ownerId, "folder", folderId);
  }

  await Folder.deleteMany({ _id: { $in: folderIds }, ownerId });
}

export async function permanentlyDeleteDocumentByUser(
  user: UserDocument,
  documentId: string,
): Promise<void> {
  const id = parseObjectId(documentId);
  const document = await Document.findOne({ _id: id, ownerId: user._id });

  if (!document) {
    throw createAppError(ErrorCode.DOCUMENT_NOT_FOUND, 404);
  }

  if (!document.deletedAt) {
    throw createAppError(ErrorCode.DOCUMENT_NOT_IN_TRASH, 400);
  }

  await permanentlyDeleteDocument(document);
}

export async function permanentlyDeleteFolderByUser(
  user: UserDocument,
  folderId: string,
): Promise<void> {
  const id = parseObjectId(folderId);
  const folder = await Folder.findOne({ _id: id, ownerId: user._id });

  if (!folder) {
    throw createAppError(ErrorCode.FOLDER_NOT_FOUND, 404);
  }

  if (!folder.deletedAt) {
    throw createAppError(ErrorCode.FOLDER_NOT_IN_TRASH, 400);
  }

  await permanentlyDeleteFolder(folder);
}

export async function purgeExpiredTrash(): Promise<{ documents: number; folders: number }> {
  const retentionDays = getTrashRetentionDays();
  const cutoff = new Date(Date.now() - retentionDays * MS_PER_DAY);

  const expiredDocs = await Document.find({ deletedAt: { $lte: cutoff } });
  for (const doc of expiredDocs) {
    await permanentlyDeleteDocument(doc);
  }

  const expiredFolders = await Folder.find({ deletedAt: { $lte: cutoff } });
  let deletedFoldersCount = 0;

  for (const folder of expiredFolders) {
    const stillExists = await Folder.exists({ _id: folder._id });
    if (stillExists) {
      const descendantIds = await collectDescendantFolderIds(folder._id, folder.ownerId);
      await permanentlyDeleteFolder(folder);
      deletedFoldersCount += descendantIds.length;
    }
  }

  return { documents: expiredDocs.length, folders: deletedFoldersCount };
}
