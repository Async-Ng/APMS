import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";

/* ── Types ─────────────────────────────────────────────────── */

export interface DriveFolder {
  id: string;
  name: string;
  color: string | null;
  parentId: string | null;
  isStarred: boolean;
  deletedAt?: string | null;
  permanentDeleteAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DriveDocument {
  id: string;
  title: string;
  originalFilename: string;
  mimeType: string;
  fileSizeBytes: number;
  status: "pending" | "processing" | "ready" | "failed";
  chunkCount?: number;
  folderId: string | null;
  isStarred: boolean;
  tags: string[];
  deletedAt?: string | null;
  permanentDeleteAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DriveContents {
  folders: DriveFolder[];
  documents: DriveDocument[];
}

/* ── Drive views ────────────────────────────────────────────── */

function driveKey(parentId?: string) {
  return ["drive", parentId ?? "root"] as const;
}

/** Root or folder contents — GET /api/drive?parentId= */
export function useDriveContents(parentId?: string) {
  return useQuery({
    queryKey: driveKey(parentId),
    queryFn: async () => {
      const params = parentId ? { parentId } : {};
      const res = await api.get<{ status: string; data: DriveContents }>(
        "/drive",
        { params },
      );
      return res.data.data;
    },
  });
}

/** Starred items — GET /api/drive/starred */
export function useStarred() {
  return useQuery({
    queryKey: ["drive", "starred"],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: DriveContents }>(
        "/drive/starred",
      );
      return res.data.data;
    },
  });
}

/** Trash items — GET /api/drive/trash */
export function useTrash() {
  return useQuery({
    queryKey: ["drive", "trash"],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: DriveContents }>(
        "/drive/trash",
      );
      return res.data.data;
    },
  });
}

/* ── Folder mutations ───────────────────────────────────────── */

interface CreateFolderBody {
  name: string;
  parentId?: string | null;
  color?: string | null;
}

export function useCreateFolder(parentId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateFolderBody) =>
      api.post<{ status: string; data: DriveFolder }>("/folders", body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: driveKey(parentId) });
    },
  });
}

interface UpdateFolderBody {
  name?: string;
  parentId?: string | null;
  color?: string | null;
}

export function useUpdateFolder(folderId: string, parentId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateFolderBody) =>
      api.patch(`/folders/${folderId}`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: driveKey(parentId) });
    },
  });
}

export function useDeleteFolder(folderId: string, parentId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete(`/folders/${folderId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: driveKey(parentId) });
      void qc.invalidateQueries({ queryKey: ["drive", "trash"] });
    },
  });
}

export function useRestoreFolder(parentId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (folderId: string) =>
      api.post(`/folders/${folderId}/restore`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["drive", "trash"] });
      void qc.invalidateQueries({ queryKey: driveKey(parentId) });
    },
  });
}

export function usePermanentDeleteFolder() {
  const qc = useQueryClient();
  const fetchMe = useAuthStore((state) => state.fetchMe);

  return useMutation({
    mutationFn: (folderId: string) =>
      api.delete(`/folders/${folderId}/permanent`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["drive", "trash"] });
      void fetchMe();
    },
  });
}

export function useToggleFolderStar(parentId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      folderId,
      starred,
    }: {
      folderId: string;
      starred: boolean;
    }) =>
      starred
        ? api.patch(`/folders/${folderId}/star`)
        : api.delete(`/folders/${folderId}/star`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: driveKey(parentId) });
      void qc.invalidateQueries({ queryKey: ["drive", "starred"] });
    },
  });
}
