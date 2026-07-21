import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "../lib/api-client";

export interface ShareUser {
  id: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
}

export interface ShareRecord {
  id: string;
  resourceType: "folder" | "document";
  resourceId: string;
  ownerId: string;
  sharedWithUserId: string;
  permission: "read";
  sharedAt: string;
}

export interface ShareFolderResource {
  id: string;
  ownerId: string;
  name: string;
  parentId: string | null;
  color: string | null;
  isStarred: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ShareDocumentResource {
  id: string;
  ownerId: string;
  folderId: string | null;
  title: string;
  originalFilename: string;
  mimeType: string;
  fileSizeBytes: number;
  status: "pending" | "processing" | "ready" | "failed";
  tags: string[];
  isStarred: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ShareWithMeItem {
  share: ShareRecord;
  resource:
    | { type: "folder"; data: ShareFolderResource }
    | { type: "document"; data: ShareDocumentResource };
}

export interface ShareByMeRecipient extends ShareRecord {
  sharedWithUser: ShareUser | null;
}

export interface ShareByMeGroup {
  resourceType: "folder" | "document";
  resourceId: string;
  resource:
    | { type: "folder"; data: ShareFolderResource }
    | { type: "document"; data: ShareDocumentResource }
    | null;
  shares: ShareByMeRecipient[];
}

export const shareKeys = {
  withMe: ["shares", "with-me"] as const,
  byMe: ["shares", "by-me"] as const,
};

function invalidateShareQueries(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: shareKeys.withMe });
  void qc.invalidateQueries({ queryKey: shareKeys.byMe });
  void qc.invalidateQueries({ queryKey: ["drive", "shared"] });
}

export function useSharesWithMe() {
  return useQuery({
    queryKey: shareKeys.withMe,
    queryFn: async () => {
      const res = await api.get<{ status: string; data: ShareWithMeItem[] }>("/shares/with-me");
      return res.data.data;
    },
  });
}

export function useSharesByMe() {
  return useQuery({
    queryKey: shareKeys.byMe,
    queryFn: async () => {
      const res = await api.get<{ status: string; data: ShareByMeGroup[] }>("/shares/by-me");
      return res.data.data;
    },
  });
}

export function useRevokeShare() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (shareId: string) => api.delete(`/shares/${shareId}`),
    onSuccess: () => invalidateShareQueries(qc),
  });
}

export interface CreateShareResult {
  created: ShareRecord[];
  skipped: number;
}

export function useCreateShare() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      resourceType: "folder" | "document";
      resourceId: string;
      sharedWithUserIds?: string[];
      emails?: string[];
    }) => {
      const res = await api.post<{ status: string; data: CreateShareResult }>("/shares", body);
      return res.data.data;
    },
    onSuccess: () => invalidateShareQueries(qc),
  });
}

export function getResourceLabel(group: ShareByMeGroup): string {
  if (!group.resource) return "Mục đã xóa";
  if (group.resource.type === "folder") return group.resource.data.name;
  return group.resource.data.title;
}

export function getShareWithMeLabel(item: ShareWithMeItem): string {
  if (item.resource.type === "folder") return item.resource.data.name;
  return item.resource.data.title;
}

export function formatSharedAt(iso: string): string {
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
