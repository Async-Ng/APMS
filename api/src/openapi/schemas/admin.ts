import { z } from "../setup";
import { successEnvelope } from "./common";
import { userSchema } from "./user";

export const documentsByStatusSchema = z.object({
  pending: z.number().int(),
  processing: z.number().int(),
  ready: z.number().int(),
  failed: z.number().int(),
});

export const documentsByVisibilitySchema = z.object({
  private: z.number().int(),
  public: z.number().int(),
});

export const aiTurnsDaySchema = z.object({
  date: z.string(),
  turns: z.number().int(),
});

export const topStorageUserSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  email: z.string().email(),
  storageUsedBytes: z.number().int(),
  storageQuotaBytes: z.number().int(),
});

export const topSubjectByDocumentsSchema = z.object({
  subjectId: z.string(),
  code: z.string(),
  name: z.string(),
  documentCount: z.number().int(),
});

export const systemStatsDataSchema = z.object({
  totalUsers: z.number().int(),
  activeUsers: z.number().int(),
  disabledUsers: z.number().int(),
  totalStorageUsedBytes: z.number().int(),
  documentsByStatus: documentsByStatusSchema,
  totalDocuments: z.number().int(),
  totalFolders: z.number().int(),
  aiTurnsToday: z.number().int(),
  aiDistinctUsersToday: z.number().int(),
  aiTurnsLast7Days: z.array(aiTurnsDaySchema),
  documentsByVisibility: documentsByVisibilitySchema,
  topUsersByStorage: z.array(topStorageUserSchema),
  topSubjectsByDocuments: z.array(topSubjectByDocumentsSchema),
});

export const systemStatsSuccessResponseSchema = successEnvelope(
  systemStatsDataSchema,
  "SystemStats",
);

export const paginationSchema = z.object({
  page: z.number().int(),
  limit: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
});

export const userListDataSchema = z.object({
  users: z.array(userSchema),
  pagination: paginationSchema,
});

export const userListSuccessResponseSchema = successEnvelope(userListDataSchema, "UserList");

export const accessEmailSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  note: z.string(),
  isActive: z.boolean(),
  createdBy: z.string(),
  updatedBy: z.string(),
  deactivatedBy: z.string().nullable(),
  deactivatedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const accessEmailSuccessResponseSchema = successEnvelope(
  accessEmailSchema,
  "AccessEmail",
);

export const accessEmailListSuccessResponseSchema = successEnvelope(
  z.object({
    entries: z.array(accessEmailSchema),
    pagination: paginationSchema,
  }),
  "AccessEmailList",
);

export const bulkAccessEmailSuccessResponseSchema = successEnvelope(
  z.object({
    summary: z.object({
      total: z.number().int(),
      created: z.number().int(),
      reactivated: z.number().int(),
      alreadyActive: z.number().int(),
      invalid: z.number().int(),
    }),
    results: z.array(
      z.object({
        index: z.number().int(),
        email: z.string(),
        status: z.enum(["created", "reactivated", "already_active", "invalid"]),
        id: z.string().optional(),
        message: z.string().optional(),
      }),
    ),
  }),
  "BulkAccessEmailResult",
);
