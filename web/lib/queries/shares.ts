import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import type { DriveDocument, DriveFolder } from "@/lib/queries/drive";

/* ── Types ─────────────────────────────────────────────────── */

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
  status: DriveDocument["status"];
  tags: string[];
  isStarred: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ShareWithMeItem {
  share: ShareRecord;
  resource: {
    type: "folder";
    data: ShareFolderResource;
  } | {
    type: "document";
    data: ShareDocumentResource;
  };
}

export interface ShareByMeRecipient extends ShareRecord {
  sharedWithUser: ShareUser | null;
}

export interface ShareByMeGroup {
  resourceType: "folder" | "document";
  resourceId: string;
  resource: {
    type: "folder";
    data: ShareFolderResource;
  } | {
    type: "document";
    data: ShareDocumentResource;
  } | null;
  shares: ShareByMeRecipient[];
}

export interface CreateSharesBody {
  resourceType: "folder" | "document";
  resourceId: string;
  sharedWithUserIds: string[];
  emails?: string[];
}

export interface CreateSharesResult {
  created: ShareRecord[];
  skipped: number;
}

export interface UserSearchParams {
  email?: string;
  displayName?: string;
}

export interface InvitePreview {
  resourceType: "folder" | "document";
  resourceName: string;
  sharerName: string;
  email: string;
}

export interface AcceptInviteResult {
  resourceType: "folder" | "document";
  resourceId: string;
}

/* ── Helpers ───────────────────────────────────────────────── */

export function toDriveFolder(resource: ShareFolderResource): DriveFolder {
  return {
    id: resource.id,
    ownerId: resource.ownerId,
    name: resource.name,
    color: resource.color,
    parentId: resource.parentId,
    isStarred: resource.isStarred,
    createdAt: resource.createdAt,
    updatedAt: resource.updatedAt,
  };
}

export function toDriveDocument(resource: ShareDocumentResource): DriveDocument {
  return {
    id: resource.id,
    ownerId: resource.ownerId,
    title: resource.title,
    originalFilename: resource.originalFilename,
    mimeType: resource.mimeType,
    fileSizeBytes: resource.fileSizeBytes,
    status: resource.status,
    folderId: resource.folderId,
    isStarred: resource.isStarred,
    tags: resource.tags,
    source: "shared",
    createdAt: resource.createdAt,
    updatedAt: resource.updatedAt,
  };
}

export const shareKeys = {
  withMe: ["shares", "with-me"] as const,
  byMe: ["shares", "by-me"] as const,
  userSearch: (params: UserSearchParams) =>
    ["users", "search", params] as const,
};

function invalidateShareQueries(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: shareKeys.withMe });
  void qc.invalidateQueries({ queryKey: shareKeys.byMe });
  void qc.invalidateQueries({ queryKey: ["drive", "shared"] });
}

/* ── Queries ───────────────────────────────────────────────── */

export function useSharesWithMe() {
  return useQuery({
    queryKey: shareKeys.withMe,
    queryFn: async () => {
      const res = await api.get<{ status: string; data: ShareWithMeItem[] }>(
        "/shares/with-me",
      );
      return res.data.data;
    },
  });
}

export function useSharesByMe() {
  return useQuery({
    queryKey: shareKeys.byMe,
    queryFn: async () => {
      const res = await api.get<{ status: string; data: ShareByMeGroup[] }>(
        "/shares/by-me",
      );
      return res.data.data;
    },
  });
}

export function useSearchUsers(params: UserSearchParams, enabled: boolean) {
  return useQuery({
    queryKey: shareKeys.userSearch(params),
    queryFn: async () => {
      const res = await api.get<{ status: string; data: ShareUser[] }>(
        "/users/search",
        { params },
      );
      return res.data.data;
    },
    enabled:
      enabled &&
      (!!params.email?.trim() || !!params.displayName?.trim()),
  });
}

/* ── Mutations ─────────────────────────────────────────────── */

export function useCreateShares() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateSharesBody) => {
      const res = await api.post<{ status: string; data: CreateSharesResult }>(
        "/shares",
        body,
      );
      return res.data.data;
    },
    onSuccess: () => invalidateShareQueries(qc),
  });
}

export function useRevokeShare() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (shareId: string) => api.delete(`/shares/${shareId}`),
    onSuccess: () => invalidateShareQueries(qc),
  });
}

export function useInvitePreview(token: string) {
  return useQuery({
    queryKey: ["invites", token] as const,
    queryFn: async () => {
      const res = await api.get<{ status: string; data: InvitePreview }>(
        `/invites/${token}`,
      );
      return res.data.data;
    },
    enabled: !!token,
    retry: false,
  });
}

export function useAcceptInvite() {
  return useMutation({
    mutationFn: async (token: string) => {
      const res = await api.post<{ status: string; data: AcceptInviteResult }>(
        `/invites/${token}/accept`,
      );
      return res.data.data;
    },
  });
}

export function getResourceLabel(
  group: ShareByMeGroup,
): string {
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
