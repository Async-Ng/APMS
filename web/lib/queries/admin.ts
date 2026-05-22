import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-client";

/* ── Types ─────────────────────────────────────────────────── */

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  disabledUsers: number;
  totalStorageUsedBytes: number;
  totalDocuments: number;
  totalFolders: number;
  documentsByStatus: Record<string, number>;
}

export interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: "user" | "admin";
  isDisabled: boolean;
  storageUsedBytes: number;
  storageQuotaBytes: number;
  createdAt: string;
  updatedAt: string;
}

interface AdminUsersResponse {
  users: AdminUser[];
  total: number;
  page: number;
  limit: number;
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
      const res = await api.get<{ status: string; data: AdminUsersResponse }>(
        "/admin/users",
        { params },
      );
      return res.data.data;
    },
    placeholderData: (prev) => prev, // keep previous page visible while loading
  });
}

export function useAdminUser(userId: string) {
  return useQuery({
    queryKey: ["admin", "users", userId],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: AdminUser }>(
        `/admin/users/${userId}`,
      );
      return res.data.data;
    },
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
    mutationFn: ({
      userId,
      body,
    }: {
      userId: string;
      body: UpdateAdminUserBody;
    }) => api.patch(`/admin/users/${userId}`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
}
