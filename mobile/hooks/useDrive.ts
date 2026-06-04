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
      const url = parentId ? `/drive?parentId=${parentId}` : "/drive";
      const res = await api.get<{ status: string; data: DriveData }>(url);
      return res.data.data;
    },
  });
}

export function useStarred() {
  return useQuery({
    queryKey: ["drive", "starred"],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: DriveData }>("/drive/starred");
      return res.data.data;
    },
  });
}

export function useTrash() {
  return useQuery({
    queryKey: ["drive", "trash"],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: DriveData }>("/drive/trash");
      return res.data.data;
    },
  });
}
