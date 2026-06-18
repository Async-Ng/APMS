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

export interface SharedDriveFolder extends DriveFolder {
  share: ShareRecord;
  ownerId: string;
}

export interface SharedDriveDocument extends DriveDocument {
  share: ShareRecord;
  ownerId: string;
}

export interface SharedDriveContents {
  folders: SharedDriveFolder[];
  documents: SharedDriveDocument[];
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
}

export interface CreateSharesResult {
  created: ShareRecord[];
  skipped: number;
}

export interface UserSearchParams {
  email?: string;
  displayName?: string;
}

/* ── Helpers ───────────────────────────────────────────────── */

export function toDriveFolder(item: SharedDriveFolder): DriveFolder {
  return {
    id: item.id,
    name: item.name,
    color: item.color,
    parentId: item.parentId,
    isStarred: item.isStarred,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export function toDriveDocument(item: SharedDriveDocument): DriveDocument {
  return {
    id: item.id,
    title: item.title,
    originalFilename: item.originalFilename,
    mimeType: item.mimeType,
    fileSizeBytes: item.fileSizeBytes,
    status: item.status,
    folderId: item.folderId,
    isStarred: item.isStarred,
    tags: item.tags,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export const shareKeys = {
  drive: ["shares", "drive"] as const,
  withMe: ["shares", "with-me"] as const,
  byMe: ["shares", "by-me"] as const,
  userSearch: (params: UserSearchParams) =>
    ["users", "search", params] as const,
};

function invalidateShareQueries(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: shareKeys.drive });
  void qc.invalidateQueries({ queryKey: shareKeys.withMe });
  void qc.invalidateQueries({ queryKey: shareKeys.byMe });
}

/* ── Queries ───────────────────────────────────────────────── */

export function useSharedDrive() {
  return useQuery({
    queryKey: shareKeys.drive,
    queryFn: async () => {
      const res = await api.get<{ status: string; data: SharedDriveContents }>(
        "/drive/shared",
      );
      return res.data.data;
    },
  });
}

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
