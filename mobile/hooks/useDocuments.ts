import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

import { api } from "../lib/api-client";

export interface DocumentDetail {
  id: string;
  ownerId: string;
  folderId: string | null;
  title: string;
  originalFilename: string;
  mimeType: string;
  s3Key: string;
  fileSizeBytes: number;
  status: "pending" | "processing" | "ready" | "failed";
  pageCount: number | null;
  tags: string[];
  isStarred: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  downloadUrl?: string;
}

export function useDocument(documentId: string, withDownloadUrl = false) {
  return useQuery({
    queryKey: ["document", documentId, withDownloadUrl],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: DocumentDetail }>(
        `/documents/${documentId}${withDownloadUrl ? "?download=true" : ""}`,
      );
      return res.data.data;
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/documents/${id}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["drive"] });
    },
  });
}

export function usePermanentDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/documents/${id}/permanent`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["drive"] });
    },
  });
}

export function useRestoreDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/documents/${id}/restore`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["drive"] });
    },
  });
}

export function useToggleDocumentStar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, star }: { id: string; star: boolean }) => {
      if (star) {
        await api.patch(`/documents/${id}/star`);
      } else {
        await api.delete(`/documents/${id}/star`);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["drive"] });
    },
  });
}

export function useUpdateDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; title?: string; tags?: string[]; folderId?: string | null }) => {
      const res = await api.patch(`/documents/${id}`, data);
      return res.data;
    },
    onSuccess: (_, vars) => {
      void queryClient.invalidateQueries({ queryKey: ["document", vars.id] });
      void queryClient.invalidateQueries({ queryKey: ["drive"] });
    },
  });
}

interface UploadIntent {
  id: string;
  uploadUrl: string;
  s3Key: string;
  expiresIn: number;
}

export function useUploadDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      uri,
      name,
      mimeType,
      size,
      folderId,
      courseSlotId,
      visibility,
      onProgress,
    }: {
      uri: string;
      name: string;
      mimeType: string;
      size: number;
      folderId?: string | null;
      courseSlotId: string;
      visibility: "private" | "public";
      onProgress?: (pct: number) => void;
    }) => {
      const intentRes = await api.post<{ status: string; data: UploadIntent }>("/documents/upload-intents", {
        originalFilename: name,
        mimeType,
        fileSizeBytes: size,
        folderId: folderId ?? null,
        courseSlotId,
        visibility,
        title: name.replace(/\.[^.]+$/, ""),
      });
      const { id, uploadUrl } = intentRes.data.data;

      const fileResponse = await fetch(uri);
      const rawBlob = await fileResponse.blob();
      // RN's XHR sends the wire Content-Type from blob.type, not from the header set
      // below. fetch(uri).blob() on a file:// URI often yields an empty/generic type,
      // which then mismatches the mimeType the server signed into the presigned URL
      // and causes a 403 SignatureDoesNotMatch. Re-stamp the blob's type so they agree.
      const blob = rawBlob.slice(0, rawBlob.size, mimeType);
      try {
        await axios.put(uploadUrl, blob, {
          headers: { "Content-Type": mimeType },
          responseType: "text",
          onUploadProgress: (e) => {
            if (e.total) onProgress?.(Math.round((e.loaded / e.total) * 100));
          },
        });
      } catch (err) {
        if (axios.isAxiosError(err)) {
          const xml = typeof err.response?.data === "string" ? err.response.data : "";
          const code = /<Code>(.*?)<\/Code>/.exec(xml)?.[1];
          const message = /<Message>(.*?)<\/Message>/.exec(xml)?.[1];
          throw new Error(
            `Tải lên S3 thất bại (${err.response?.status ?? "?"}${code ? ` ${code}` : ""}): ${
              message ?? err.message
            }`,
          );
        }
        throw err;
      }

      await api.post(`/documents/${id}/complete`);
      return id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["drive"] });
    },
  });
}
