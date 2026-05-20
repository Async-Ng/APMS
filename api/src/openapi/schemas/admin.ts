import { z } from "../setup";
import { successEnvelope } from "./common";
import { userSchema } from "./user";

export const documentsByStatusSchema = z.object({
  pending: z.number().int(),
  processing: z.number().int(),
  ready: z.number().int(),
  failed: z.number().int(),
});

export const systemStatsDataSchema = z.object({
  totalUsers: z.number().int(),
  activeUsers: z.number().int(),
  disabledUsers: z.number().int(),
  totalStorageUsedBytes: z.number().int(),
  documentsByStatus: documentsByStatusSchema,
  totalDocuments: z.number().int(),
  totalFolders: z.number().int(),
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
