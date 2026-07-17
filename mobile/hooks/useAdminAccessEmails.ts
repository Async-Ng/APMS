import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "../lib/api-client";

export interface AccessEmail {
  id: string;
  email: string;
  note?: string;
  isActive: boolean;
  createdBy: string;
  updatedBy: string;
  deactivatedBy: string | null;
  deactivatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AccessEmailListResult {
  entries: AccessEmail[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export type AccessEmailStatus = "active" | "inactive" | "all";

export function useAdminAccessEmails(params: { page: number; search: string; status: AccessEmailStatus }) {
  return useQuery({
    queryKey: ["admin", "access-emails", params.page, params.search, params.status],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: AccessEmailListResult }>("/admin/access-emails", {
        params: { page: params.page, limit: 20, search: params.search.trim() || undefined, status: params.status },
      });
      return res.data.data;
    },
  });
}

export interface BulkAccessEmailResult {
  summary: { total: number; created: number; reactivated: number; alreadyActive: number; invalid: number };
  results: { index: number; email: string; status: string; id?: string; message?: string }[];
}

export function useBulkCreateAccessEmails() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entries: { email: string; note?: string }[]) => {
      const res = await api.post<{ status: string; data: BulkAccessEmailResult }>("/admin/access-emails/bulk", {
        entries,
      });
      return res.data.data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin", "access-emails"] }),
  });
}

export function useUpdateAccessEmail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: { note?: string; isActive?: boolean } }) => {
      const res = await api.patch<{ status: string; data: AccessEmail }>(`/admin/access-emails/${id}`, body);
      return res.data.data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin", "access-emails"] }),
  });
}

export function useDeactivateAccessEmail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/access-emails/${id}`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin", "access-emails"] }),
  });
}
