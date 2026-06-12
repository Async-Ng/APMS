import type { Types } from "mongoose";

import { createAppError, ErrorCode } from "../errors/error-codes";
import { Document as ApmsDocument } from "../models/document.model";
import {
  Folder,
  toFolderResponse,
  type FolderDocument,
} from "../models/folder.model";
import type { UserDocument } from "../models/user.model";
import { parseObjectId } from "../utils/objectId";
import { findReadableFolder } from "./share.service";

async function findActiveFolder(
  folderId: Types.ObjectId,
  ownerId: Types.ObjectId,
): Promise<FolderDocument> {
  const folder = await Folder.findOne({
    _id: folderId,
    ownerId,
    deletedAt: null,
  });

  if (!folder) {
    throw createAppError(ErrorCode.FOLDER_NOT_FOUND, 404);
  }

  return folder;
}

async function findFolderIncludingTrash(
  folderId: Types.ObjectId,
  ownerId: Types.ObjectId,
): Promise<FolderDocument> {
  const folder = await Folder.findOne({ _id: folderId, ownerId });

  if (!folder) {
    throw createAppError(ErrorCode.FOLDER_NOT_FOUND, 404);
  }

  return folder;
}

async function assertParentValid(
  parentId: Types.ObjectId | null,
  ownerId: Types.ObjectId,
): Promise<void> {
  if (!parentId) {
    return;
  }

  await findActiveFolder(parentId, ownerId);
}

async function assertUniqueName(
  name: string,
  parentId: Types.ObjectId | null,
  ownerId: Types.ObjectId,
  excludeId?: Types.ObjectId,
): Promise<void> {
  const query: Record<string, unknown> = {
    ownerId,
    parentId,
    name,
    deletedAt: null,
  };

  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  const existing = await Folder.findOne(query);

  if (existing) {
    throw createAppError(ErrorCode.FOLDER_NAME_EXISTS, 409);
  }
}

async function getFolderParentId(
  folderId: Types.ObjectId,
  ownerId: Types.ObjectId,
): Promise<Types.ObjectId | null> {
  const folder = await Folder.findOne({
    _id: folderId,
    ownerId,
    deletedAt: null,
  }).select("parentId");

  return folder?.parentId ?? null;
}

async function wouldCreateCycle(
  folderId: Types.ObjectId,
  newParentId: Types.ObjectId,
  ownerId: Types.ObjectId,
): Promise<boolean> {
  let currentId: Types.ObjectId | null = newParentId;
  const maxDepth = 100;

  for (let depth = 0; depth < maxDepth && currentId; depth += 1) {
    if (currentId.equals(folderId)) {
      return true;
    }

    currentId = await getFolderParentId(currentId, ownerId);
  }

  return false;
}

export async function createFolder(
  user: UserDocument,
  input: { name: string; parentId?: string | null; color?: string },
) {
  const ownerId = user._id;
  const parentId = input.parentId
    ? parseObjectId(input.parentId, "parentId")
    : null;

  await assertParentValid(parentId, ownerId);
  await assertUniqueName(input.name, parentId, ownerId);

  const folder = await Folder.create({
    ownerId,
    name: input.name,
    parentId,
    ...(input.color !== undefined ? { color: input.color } : {}),
  });

  return toFolderResponse(folder);
}

export async function getFolder(user: UserDocument, folderId: string) {
  const folder = await findReadableFolder(user._id, parseObjectId(folderId));
  return toFolderResponse(folder);
}

export async function updateFolder(
  user: UserDocument,
  folderId: string,
  input: { name?: string; parentId?: string | null; color?: string },
) {
  const id = parseObjectId(folderId);
  const folder = await findActiveFolder(id, user._id);

  if (input.parentId !== undefined) {
    const newParentId = input.parentId
      ? parseObjectId(input.parentId, "parentId")
      : null;

    if (newParentId && (await wouldCreateCycle(id, newParentId, user._id))) {
      throw createAppError(ErrorCode.FOLDER_CYCLE, 400);
    }

    await assertParentValid(newParentId, user._id);
    folder.parentId = newParentId;
  }

  if (input.name !== undefined) {
    await assertUniqueName(input.name, folder.parentId ?? null, user._id, id);
    folder.name = input.name;
  }

  if (input.color !== undefined) {
    folder.color = input.color;
  }

  await folder.save();
  return toFolderResponse(folder);
}

export async function deleteFolder(user: UserDocument, folderId: string) {
  const rootId = parseObjectId(folderId);
  await findActiveFolder(rootId, user._id);

  const now = new Date();
  const folderIds: Types.ObjectId[] = [rootId];
  const queue: Types.ObjectId[] = [rootId];

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (!currentId) {
      continue;
    }

    const children = await Folder.find({
      ownerId: user._id,
      parentId: currentId,
      deletedAt: null,
    }).select("_id");

    for (const child of children) {
      folderIds.push(child._id);
      queue.push(child._id);
    }
  }

  await Promise.all([
    Folder.updateMany(
      { _id: { $in: folderIds }, ownerId: user._id },
      { $set: { deletedAt: now } },
    ),
    ApmsDocument.updateMany(
      { ownerId: user._id, folderId: { $in: folderIds }, deletedAt: null },
      { $set: { deletedAt: now } },
    ),
  ]);

  const folder = await Folder.findById(rootId);
  if (!folder) {
    throw createAppError(ErrorCode.FOLDER_NOT_FOUND, 404);
  }

  return toFolderResponse(folder);
}

export async function restoreFolder(user: UserDocument, folderId: string) {
  const id = parseObjectId(folderId);
  const folder = await findFolderIncludingTrash(id, user._id);

  if (!folder.deletedAt) {
    throw createAppError(ErrorCode.FOLDER_NOT_IN_TRASH, 400);
  }

  if (folder.parentId) {
    const parent = await Folder.findOne({
      _id: folder.parentId,
      ownerId: user._id,
    });

    if (!parent || parent.deletedAt) {
      throw createAppError(ErrorCode.RESTORE_PARENT_FIRST, 400);
    }
  }

  await assertUniqueName(folder.name, folder.parentId ?? null, user._id, id);

  folder.deletedAt = null;
  await folder.save();

  return toFolderResponse(folder);
}

export async function setFolderStarred(
  user: UserDocument,
  folderId: string,
  isStarred: boolean,
) {
  const folder = await findActiveFolder(parseObjectId(folderId), user._id);
  folder.isStarred = isStarred;
  await folder.save();
  return toFolderResponse(folder);
}
