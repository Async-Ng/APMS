import { useQuery } from "@tanstack/react-query";

import { api } from "../lib/api-client";

export interface DriveFolder {
  id: string;
  name: string;
  color: string | null;
  isStarred: boolean;
  parentId: string | null;
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
  isStarred: boolean;
  folderId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DriveData {
  folders: DriveFolder[];
  documents: DriveDocument[];
}

export function useDrive(parentId?: string | null) {
  return useQuery({
    queryKey: ["drive", parentId ?? "root"],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: DriveData }>("/documents", {
        params: { view: "my", ...(parentId ? { parentId } : {}) },
      });
      return res.data.data;
    },
  });
}

export function useStarred() {
  return useQuery({
    queryKey: ["drive", "starred"],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: DriveData }>("/documents", {
        params: { view: "starred" },
      });
      return res.data.data;
    },
  });
}

export function useTrash() {
  return useQuery({
    queryKey: ["drive", "trash"],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: DriveData }>("/documents", {
        params: { view: "trash" },
      });
      return res.data.data;
    },
  });
}

/** Shared-with-me folder contents — GET /documents?view=shared&parentId= */
export function useSharedFolderContents(parentId: string) {
  return useQuery({
    queryKey: ["drive", "shared", parentId],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: DriveData }>("/documents", {
        params: { view: "shared", parentId },
      });
      return res.data.data;
    },
    enabled: !!parentId,
  });
}
