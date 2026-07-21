import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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
  visibility: "private" | "public";
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
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "pending" || status === "processing" ? 4000 : false;
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
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      title?: string;
      tags?: string[];
      folderId?: string | null;
      visibility?: "private" | "public";
    }) => {
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
  document: { id: string };
  uploadUrl: string;
  s3Key: string;
  expiresIn: number;
}

function shortS3Response(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, 240);
}

function uploadBlobToS3({
  uploadUrl,
  blob,
  mimeType,
  onProgress,
}: {
  uploadUrl: string;
  blob: Blob;
  mimeType: string;
  onProgress?: (pct: number) => void;
}): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", mimeType);
    xhr.responseType = "text";

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress?.(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
        return;
      }
      const detail = typeof xhr.responseText === "string" ? shortS3Response(xhr.responseText) : "";
      reject(new Error(`Tải lên S3 thất bại (${xhr.status})${detail ? `: ${detail}` : ""}`));
    };

    xhr.onerror = () => reject(new Error("Tải lên S3 thất bại do lỗi mạng."));
    xhr.ontimeout = () => reject(new Error("Tải lên S3 quá thời gian chờ."));
    xhr.send(blob);
  });
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
      const { document, uploadUrl } = intentRes.data.data;

      const fileResponse = await fetch(uri);
      const rawBlob = await fileResponse.blob();
      // RN's XHR sends the wire Content-Type from blob.type. fetch(uri).blob()
      // can produce an empty/generic type, so stamp the blob to match the intent.
      const blob = rawBlob.slice(0, rawBlob.size, mimeType);
      await uploadBlobToS3({ uploadUrl, blob, mimeType, onProgress });

      await api.post(`/documents/${document.id}/complete`);
      return document.id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["drive"] });
    },
  });
}

export interface PublicDocument extends DocumentDetail {
  source?: "public" | "owned" | "shared";
  matchType?: "exact_course" | "same_subject_other_semester" | "global_public" | null;
  owner?: {
    id: string;
    displayName: string;
    email: string;
    avatarUrl: string | null;
  } | null;
  courseSlot?: {
    id: string;
    semesterId: string;
    semester?: { id: string; name: string; code: string } | null;
    curriculum?: { id: string; name: string; code: string } | null;
    subject?: { id: string; name: string; code: string } | null;
  } | null;
}

export interface PublicDocumentsResponse {
  folders: unknown[];
  documents: PublicDocument[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PublicDocumentsParams {
  sort?: "newest" | "oldest" | "title";
  search?: string;
  match?: "auto" | "all" | "exact" | "related";
  curriculumId?: string;
  semesterId?: string;
  subjectId?: string;
  page?: number;
  limit?: number;
}

export function usePublicDocuments(params: PublicDocumentsParams = {}) {
  return useQuery({
    queryKey: ["documents", "public", params],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: PublicDocumentsResponse }>("/documents", {
        params: {
          view: "public",
          ...params,
        },
      });
      return res.data.data;
    },
  });
}
