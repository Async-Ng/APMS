import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import type { Pagination } from "@/lib/queries/admin";

export interface AccessEmail {
  id: string;
  email: string;
  note: string;
  isActive: boolean;
  createdBy: string;
  updatedBy: string;
  deactivatedBy: string | null;
  deactivatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type BulkAccessEmailStatus =
  | "created"
  | "reactivated"
  | "already_active"
  | "invalid";

export interface BulkAccessEmailResult {
  summary: {
    total: number;
    created: number;
    reactivated: number;
    alreadyActive: number;
    invalid: number;
  };
  results: Array<{
    index: number;
    email: string;
    status: BulkAccessEmailStatus;
    id?: string;
    message?: string;
  }>;
}

export function useAccessEmails(params: {
  page: number;
  limit: number;
  search?: string;
  status?: "active" | "inactive" | "all";
}) {
  return useQuery({
    queryKey: ["admin", "access-emails", params],
    queryFn: async () => {
      const res = await api.get<{
        status: string;
        data: { entries: AccessEmail[]; pagination: Pagination };
      }>("/admin/access-emails", { params });
      return res.data.data;
    },
    placeholderData: (prev) => prev,
  });
}

export function useBulkCreateAccessEmails() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entries: Array<{ email: string; note?: string }>) => {
      const res = await api.post<{ status: string; data: BulkAccessEmailResult }>(
        "/admin/access-emails/bulk",
        { entries },
      );
      return res.data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "access-emails"] });
    },
  });
}

export function useUpdateAccessEmail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      body,
    }: {
      id: string;
      body: { note?: string; isActive?: boolean };
    }) => {
      const res = await api.patch<{ status: string; data: AccessEmail }>(
        `/admin/access-emails/${id}`,
        body,
      );
      return res.data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "access-emails"] });
    },
  });
}

export function useDeactivateAccessEmail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete<{ status: string; data: AccessEmail }>(
        `/admin/access-emails/${id}`,
      );
      return res.data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "access-emails"] });
    },
  });
}
