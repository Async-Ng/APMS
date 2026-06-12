import { createAppError, ErrorCode } from "../errors/error-codes";
import { Document as ApmsDocument } from "../models/document.model";
import { Folder } from "../models/folder.model";
import { User, type UserDocument } from "../models/user.model";
import { toUserResponse } from "./auth.service";
import { parseObjectId } from "../utils/objectId";

export async function listUsers(options: {
  page: number;
  limit: number;
  search?: string;
}) {
  const { page, limit, search } = options;
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = {};

  if (search) {
    const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ email: regex }, { displayName: regex }];
  }

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  return {
    users: users.map(toUserResponse),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getUserById(userId: string) {
  const user = await User.findById(parseObjectId(userId));

  if (!user) {
    throw createAppError(ErrorCode.USER_NOT_FOUND, 404);
  }

  return toUserResponse(user);
}

export async function updateUser(
  admin: UserDocument,
  userId: string,
  input: { storageQuotaBytes?: number; isDisabled?: boolean },
) {
  const targetId = parseObjectId(userId);
  const target = await User.findById(targetId);

  if (!target) {
    throw createAppError(ErrorCode.USER_NOT_FOUND, 404);
  }

  if (input.isDisabled === true && target._id.equals(admin._id)) {
    throw createAppError(ErrorCode.CANNOT_DISABLE_SELF, 400);
  }

  if (input.storageQuotaBytes !== undefined) {
    if (input.storageQuotaBytes < target.storageUsedBytes) {
      throw createAppError(ErrorCode.QUOTA_TOO_LOW, 400);
    }
    target.storageQuotaBytes = input.storageQuotaBytes;
  }

  if (input.isDisabled !== undefined) {
    target.isDisabled = input.isDisabled;
  }

  await target.save();
  return toUserResponse(target);
}

export async function getSystemStats() {
  const [
    totalUsers,
    activeUsers,
    disabledUsers,
    storageAgg,
    documentsByStatus,
    totalDocuments,
    totalFolders,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ isDisabled: false }),
    User.countDocuments({ isDisabled: true }),
    User.aggregate<{ total: number }>([
      { $group: { _id: null, total: { $sum: "$storageUsedBytes" } } },
    ]),
    ApmsDocument.aggregate<{ _id: string; count: number }>([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    ApmsDocument.countDocuments(),
    Folder.countDocuments(),
  ]);

  const documentsByStatusMap = {
    pending: 0,
    processing: 0,
    ready: 0,
    failed: 0,
  };

  for (const item of documentsByStatus) {
    if (item._id in documentsByStatusMap) {
      documentsByStatusMap[item._id as keyof typeof documentsByStatusMap] = item.count;
    }
  }

  return {
    totalUsers,
    activeUsers,
    disabledUsers,
    totalStorageUsedBytes: storageAgg[0]?.total ?? 0,
    documentsByStatus: documentsByStatusMap,
    totalDocuments,
    totalFolders,
  };
}
