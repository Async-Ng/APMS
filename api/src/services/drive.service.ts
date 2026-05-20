import type { Types } from "mongoose";

import { AppError } from "../errors/AppError";
import { Document, toDocumentResponse } from "../models/document.model";
import { Folder, toFolderResponse } from "../models/folder.model";
import type { UserDocument } from "../models/user.model";
import { parseObjectId } from "../utils/objectId";

export async function listDriveContents(
  user: UserDocument,
  parentId?: string | null,
) {
  const ownerId = user._id;
  let resolvedParentId: Types.ObjectId | null = null;

  if (parentId && parentId !== "null") {
    resolvedParentId = parseObjectId(parentId, "parentId");
    const parent = await Folder.findOne({
      _id: resolvedParentId,
      ownerId,
      deletedAt: null,
    });

    if (!parent) {
      throw new AppError("Folder not found", 404);
    }
  }

  const [folders, documents] = await Promise.all([
    Folder.find({
      ownerId,
      parentId: resolvedParentId,
      deletedAt: null,
    }).sort({ name: 1 }),
    Document.find({
      ownerId,
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
