import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-client";

/* ── Shared types ─────────────────────────────────────────── */

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: Pagination;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  disabledUsers: number;
  totalStorageUsedBytes: number;
  totalDocuments: number;
  totalFolders: number;
  documentsByStatus: {
    pending?: number;
    processing?: number;
    ready?: number;
    failed?: number;
  };
}

export interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: "user" | "admin";
  isDisabled: boolean;
  majorId: string | null;
  currentSemester: number | null;
  currentSubjectIds: string[];
  storageUsedBytes: number;
  storageQuotaBytes: number;
  createdAt: string;
  updatedAt: string;
}

interface AdminUsersApiResponse {
  users: AdminUser[];
  pagination: Pagination;
}

/* ── Admin queries ──────────────────────────────────────────── */

export function useAdminStats() {
  return useQuery({
    queryKey: ["admin", "stats"],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: AdminStats }>(
        "/admin/stats",
      );
      return res.data.data;
    },
  });
}

export function useAdminUsers(params: {
  page: number;
  limit: number;
  search?: string;
}) {
  return useQuery({
    queryKey: ["admin", "users", params],
    queryFn: async () => {
      const res = await api.get<{
        status: string;
        data: AdminUsersApiResponse;
      }>("/admin/users", { params });
      const { users, pagination } = res.data.data;
      return { users, pagination };
    },
    placeholderData: (prev) => prev,
  });
}

export function useAdminUser(userId: string | null) {
  return useQuery({
    queryKey: ["admin", "users", userId],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: AdminUser }>(
        `/admin/users/${userId}`,
      );
      return res.data.data;
    },
    enabled: !!userId,
  });
}

/* ── Admin mutations ────────────────────────────────────────── */

interface UpdateAdminUserBody {
  storageQuotaBytes?: number;
  isDisabled?: boolean;
}

export function useUpdateAdminUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      body,
    }: {
      userId: string;
      body: UpdateAdminUserBody;
    }) => {
      const res = await api.patch<{ status: string; data: AdminUser }>(
        `/admin/users/${userId}`,
        body,
      );
      return res.data.data;
    },
    onSuccess: (_data, { userId }) => {
      void qc.invalidateQueries({ queryKey: ["admin", "users"] });
      void qc.invalidateQueries({ queryKey: ["admin", "users", userId] });
      void qc.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
  });
}
