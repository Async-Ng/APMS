import { createAppError, ErrorCode } from "../errors/error-codes";
import { ChatMessage } from "../models/chat-message.model";
import { Document as ApmsDocument } from "../models/document.model";
import { Folder } from "../models/folder.model";
import { User, type UserDocument, type UserRole } from "../models/user.model";
import {
  chatTurnCreatedSince,
  lastNUtcDateKeys,
  startOfUtcDay,
} from "../utils/chat-turn";
import { parseObjectId } from "../utils/objectId";
import { toUserResponse } from "./auth.service";
import {
  addUserToAdminGroup,
  removeUserFromAdminGroup,
} from "./cognito-admin.service";

const NOT_DELETED = { deletedAt: null };

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

async function countActiveAdmins(excludeUserId?: string): Promise<number> {
  const filter: Record<string, unknown> = { role: "admin", isDisabled: false };
  if (excludeUserId) {
    filter._id = { $ne: parseObjectId(excludeUserId) };
  }
  return User.countDocuments(filter);
}

async function syncCognitoAdminRole(
  cognitoSub: string,
  role: UserRole,
  previousRole: UserRole,
): Promise<void> {
  if (role === previousRole) return;

  if (role === "admin") {
    await addUserToAdminGroup(cognitoSub);
    return;
  }

  await removeUserFromAdminGroup(cognitoSub);
}

export async function updateUser(
  admin: UserDocument,
  userId: string,
  input: { storageQuotaBytes?: number; isDisabled?: boolean; role?: UserRole },
) {
  const targetId = parseObjectId(userId);
  const target = await User.findById(targetId);

  if (!target) {
    throw createAppError(ErrorCode.USER_NOT_FOUND, 404);
  }

  if (input.isDisabled === true && target._id.equals(admin._id)) {
    throw createAppError(ErrorCode.CANNOT_DISABLE_SELF, 400);
  }

  if (input.role === "user" && target._id.equals(admin._id)) {
    throw createAppError(ErrorCode.CANNOT_DEMOTE_SELF, 400);
  }

  if (input.role === "user" && target.role === "admin") {
    const remainingAdmins = await countActiveAdmins(target._id.toString());
    if (remainingAdmins === 0) {
      throw createAppError(ErrorCode.CANNOT_DEMOTE_LAST_ADMIN, 400);
    }
  }

  if (input.role === "admin" && target.isDisabled) {
    throw createAppError(ErrorCode.VALIDATION_ERROR, 400, {
      technicalDetail: "Cannot promote a disabled user to admin",
    });
  }

  const previousRole = target.role;

  if (input.storageQuotaBytes !== undefined) {
    if (input.storageQuotaBytes < target.storageUsedBytes) {
      throw createAppError(ErrorCode.QUOTA_TOO_LOW, 400);
    }
    target.storageQuotaBytes = input.storageQuotaBytes;
  }

  if (input.isDisabled !== undefined) {
    target.isDisabled = input.isDisabled;
  }

  if (input.role !== undefined && input.role !== target.role) {
    await syncCognitoAdminRole(target.cognitoSub, input.role, previousRole);
    target.role = input.role;
  }

  try {
    await target.save();
  } catch (error) {
    if (input.role !== undefined && input.role !== previousRole) {
      await syncCognitoAdminRole(target.cognitoSub, previousRole, input.role).catch(() => undefined);
    }
    throw error;
  }

  return toUserResponse(target);
}

export async function getSystemStats() {
  const startOfToday = startOfUtcDay();
  const sevenDayKeys = lastNUtcDateKeys(7);
  const sevenDaysAgo = startOfUtcDay();
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 6);

  const chatSessionsCollection = "chatsessions";
  const courseSlotsCollection = "courseslots";
  const subjectsCollection = "subjects";

  const [
    totalUsers,
    activeUsers,
    disabledUsers,
    storageAgg,
    documentsByStatus,
    totalDocuments,
    totalFolders,
    documentsByVisibility,
    topUsers,
    aiTodayAgg,
    aiLast7Agg,
    topSubjectsAgg,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ isDisabled: false }),
    User.countDocuments({ isDisabled: true }),
    User.aggregate<{ total: number }>([
      { $group: { _id: null, total: { $sum: "$storageUsedBytes" } } },
    ]),
    ApmsDocument.aggregate<{ _id: string; count: number }>([
      { $match: NOT_DELETED },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    ApmsDocument.countDocuments(NOT_DELETED),
    Folder.countDocuments(NOT_DELETED),
    ApmsDocument.aggregate<{ _id: string; count: number }>([
      { $match: NOT_DELETED },
      { $group: { _id: "$visibility", count: { $sum: 1 } } },
    ]),
    User.find()
      .sort({ storageUsedBytes: -1 })
      .limit(5)
      .select("displayName email storageUsedBytes storageQuotaBytes")
      .lean(),
    ChatMessage.aggregate<{
      aiTurnsToday: number;
      distinctUsersToday: number;
    }>([
      { $match: chatTurnCreatedSince(startOfToday) },
      {
        $lookup: {
          from: chatSessionsCollection,
          localField: "sessionId",
          foreignField: "_id",
          as: "session",
        },
      },
      { $unwind: "$session" },
      {
        $group: {
          _id: null,
          aiTurnsToday: { $sum: 1 },
          distinctUserIds: { $addToSet: "$session.userId" },
        },
      },
      {
        $project: {
          _id: 0,
          aiTurnsToday: 1,
          distinctUsersToday: { $size: "$distinctUserIds" },
        },
      },
    ]),
    ChatMessage.aggregate<{ _id: string; turns: number }>([
      { $match: chatTurnCreatedSince(sevenDaysAgo) },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "UTC" },
          },
          turns: { $sum: 1 },
        },
      },
    ]),
    ApmsDocument.aggregate<{
      subjectId: unknown;
      code: string;
      name: string;
      documentCount: number;
    }>([
      {
        $match: {
          ...NOT_DELETED,
          courseSlotId: { $ne: null },
        },
      },
      { $group: { _id: "$courseSlotId", docCount: { $sum: 1 } } },
      {
        $lookup: {
          from: courseSlotsCollection,
          localField: "_id",
          foreignField: "_id",
          as: "slot",
        },
      },
      { $unwind: "$slot" },
      {
        $group: {
          _id: "$slot.subjectId",
          documentCount: { $sum: "$docCount" },
        },
      },
      { $sort: { documentCount: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: subjectsCollection,
          localField: "_id",
          foreignField: "_id",
          as: "subject",
        },
      },
      { $unwind: "$subject" },
      {
        $project: {
          _id: 0,
          subjectId: "$_id",
          code: "$subject.code",
          name: "$subject.name",
          documentCount: 1,
        },
      },
    ]),
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

  const documentsByVisibilityMap = {
    private: 0,
    public: 0,
  };

  for (const item of documentsByVisibility) {
    if (item._id === "private" || item._id === "public") {
      documentsByVisibilityMap[item._id] = item.count;
    }
  }

  const turnsByDate = new Map(aiLast7Agg.map((row) => [row._id, row.turns]));
  const aiTurnsLast7Days = sevenDayKeys.map((date) => ({
    date,
    turns: turnsByDate.get(date) ?? 0,
  }));

  const aiToday = aiTodayAgg[0];

  return {
    totalUsers,
    activeUsers,
    disabledUsers,
    totalStorageUsedBytes: storageAgg[0]?.total ?? 0,
    documentsByStatus: documentsByStatusMap,
    totalDocuments,
    totalFolders,
    aiTurnsToday: aiToday?.aiTurnsToday ?? 0,
    aiDistinctUsersToday: aiToday?.distinctUsersToday ?? 0,
    aiTurnsLast7Days,
    documentsByVisibility: documentsByVisibilityMap,
    topUsersByStorage: topUsers.map((u) => ({
      id: u._id.toString(),
      displayName: u.displayName,
      email: u.email,
      storageUsedBytes: u.storageUsedBytes,
      storageQuotaBytes: u.storageQuotaBytes,
    })),
    topSubjectsByDocuments: topSubjectsAgg.map((row) => ({
      subjectId: String(row.subjectId),
      code: row.code,
      name: row.name,
      documentCount: row.documentCount,
    })),
  };
}
