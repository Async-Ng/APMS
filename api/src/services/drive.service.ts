import type { Types } from "mongoose";

import { AppError } from "../errors/AppError";
import { Document, toDocumentResponse } from "../models/document.model";
import { Folder, toFolderResponse } from "../models/folder.model";
import type { UserDocument } from "../models/user.model";
import { parseObjectId } from "../utils/objectId";
import {
  checkShareAccess,
  listSharedWithMe as listSharedWithMeService,
} from "./share.service";

export async function listDriveContents(
  user: UserDocument,
  parentId?: string | null,
) {
  const userId = user._id;
  let contentOwnerId: Types.ObjectId = userId;
  let resolvedParentId: Types.ObjectId | null = null;

  if (parentId && parentId !== "null") {
    resolvedParentId = parseObjectId(parentId, "parentId");
    const parent = await Folder.findOne({
      _id: resolvedParentId,
      deletedAt: null,
    });

    if (!parent) {
      throw new AppError("Folder not found", 404);
    }

    if (parent.ownerId.equals(userId)) {
      contentOwnerId = userId;
    } else {
      const hasAccess = await checkShareAccess(userId, "folder", resolvedParentId);
      if (!hasAccess) {
        throw new AppError("Folder not found", 404);
      }
      contentOwnerId = parent.ownerId as Types.ObjectId;
    }
  }

  const [folders, documents] = await Promise.all([
    Folder.find({
      ownerId: contentOwnerId,
      parentId: resolvedParentId,
      deletedAt: null,
    }).sort({ name: 1 }),
    Document.find({
      ownerId: contentOwnerId,
      folderId: resolvedParentId,
      deletedAt: null,
    }).sort({ title: 1 }),
  ]);

  return {
    folders: folders.map(toFolderResponse),
    documents: documents.map((doc) => toDocumentResponse(doc)),
  };
}

export async function listStarred(user: UserDocument) {
  const ownerId = user._id;

  const [folders, documents] = await Promise.all([
    Folder.find({ ownerId, isStarred: true, deletedAt: null }).sort({ updatedAt: -1 }),
    Document.find({ ownerId, isStarred: true, deletedAt: null }).sort({ updatedAt: -1 }),
  ]);

  return {
    folders: folders.map(toFolderResponse),
    documents: documents.map((doc) => toDocumentResponse(doc)),
  };
}

export async function listTrash(user: UserDocument) {
  const ownerId = user._id;

  const [folders, documents] = await Promise.all([
    Folder.find({ ownerId, deletedAt: { $ne: null } }).sort({ deletedAt: -1 }),
    Document.find({ ownerId, deletedAt: { $ne: null } }).sort({ deletedAt: -1 }),
  ]);

  return {
    folders: folders.map(toFolderResponse),
    documents: documents.map((doc) => toDocumentResponse(doc)),
  };
}

/**
 * Drive view "Shared with me" — delegates to share.service for consistency.
 * Returns folders and documents shared with the current user, grouped by type.
 */
export async function listSharedWithMe(user: UserDocument) {
  const items = await listSharedWithMeService(user);

  const folders = items
    .filter((i) => i.resource?.type === "folder")
    .map((i) => ({
      share: i.share,
      ...(i.resource as { type: "folder"; data: ReturnType<typeof toFolderResponse> }).data,
    }));

  const documents = items
    .filter((i) => i.resource?.type === "document")
    .map((i) => ({
      share: i.share,
      ...(i.resource as { type: "document"; data: ReturnType<typeof toDocumentResponse> }).data,
    }));

  return { folders, documents };
}

