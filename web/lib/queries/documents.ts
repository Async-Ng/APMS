import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import type { DriveDocument } from "@/lib/queries/drive";

/* ── Types ─────────────────────────────────────────────────── */

interface UploadIntentBody {
  originalFilename: string;
  mimeType: string;
  fileSizeBytes: number;
  folderId?: string | null;
  title?: string;
}

interface UploadIntentResponse {
  /** The newly-created document record (with id to pass to /complete) */
  document: DriveDocument;
  uploadUrl: string;
  s3Key: string;
  expiresIn: number;
}

/* ── Document queries ───────────────────────────────────────── */

export function useDocument(documentId: string) {
  return useQuery({
    queryKey: ["documents", documentId],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: DriveDocument }>(
        `/documents/${documentId}`,
      );
      return res.data.data;
    },
  });
}

/** Fetch document with a presigned download URL. */
export function useDocumentDownloadUrl(documentId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["documents", documentId, "download"],
    queryFn: async () => {
      const res = await api.get<{
        status: string;
        data: DriveDocument & { downloadUrl: string };
      }>(`/documents/${documentId}?download=true`);
      return res.data.data;
    },
    enabled,
    staleTime: 60_000, // presigned URLs are short-lived; don't cache too long
  });
}

/* ── Document mutations ─────────────────────────────────────── */

interface UpdateDocumentBody {
  title?: string;
  tags?: string[];
  folderId?: string | null;
}

export function useUpdateDocument(documentId: string, parentId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateDocumentBody) =>
      api.patch(`/documents/${documentId}`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["documents", documentId] });
      void qc.invalidateQueries({ queryKey: ["drive", parentId ?? "root"] });
    },
  });
}

export function useDeleteDocument(documentId: string, parentId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete(`/documents/${documentId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["drive", parentId ?? "root"] });
      void qc.invalidateQueries({ queryKey: ["drive", "trash"] });
    },
  });
}

export function useRestoreDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (documentId: string) =>
      api.post(`/documents/${documentId}/restore`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["drive", "trash"] });
    },
  });
}

export function useToggleDocumentStar(parentId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      documentId,
      starred,
    }: {
      documentId: string;
      starred: boolean;
    }) =>
      starred
        ? api.patch(`/documents/${documentId}/star`)
        : api.delete(`/documents/${documentId}/star`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["drive", parentId ?? "root"] });
      void qc.invalidateQueries({ queryKey: ["drive", "starred"] });
    },
  });
}

/* ── Upload flow ─────────────────────────────────────────────── */

/** Step 1: Create upload intent → get presigned S3 URL */
export function useUploadIntent() {
  return useMutation({
    mutationFn: async (body: UploadIntentBody) => {
      const res = await api.post<{
        status: string;
        data: UploadIntentResponse;
      }>("/documents/upload-intents", body);
      return res.data.data;
    },
  });
}

/** Step 2: PUT file binary directly to S3 presigned URL */
export async function uploadToS3(
  uploadUrl: string,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", file.type);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`S3 upload failed: ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error("S3 upload network error"));
    xhr.send(file);
  });
}

/** Step 3: Mark upload as complete */
export function useCompleteUpload() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      documentId,
      parentId,
    }: {
      documentId: string;
      parentId?: string;
    }) => {
      const res = await api.post<{ status: string; data: DriveDocument }>(
        `/documents/${documentId}/complete`,
      );
      return { document: res.data.data, parentId };
    },
    onSuccess: ({ parentId }) => {
      void qc.invalidateQueries({ queryKey: ["drive", parentId ?? "root"] });
    },
  });
}
