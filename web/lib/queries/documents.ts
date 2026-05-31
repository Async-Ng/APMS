import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import type { DriveContents, DriveDocument } from "@/lib/queries/drive";

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
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["drive"] });
      
      qc.setQueriesData(
        { queryKey: ["drive"] },
        (old: DriveContents | undefined) => {
          if (!old) return old;
          return {
            ...old,
            documents: old.documents.filter((d) => d.id !== documentId),
          };
        },
      );
      return {};
    },
    onError: () => {
      void qc.invalidateQueries({ queryKey: ["drive"] });
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ["drive", parentId ?? "root"] });
      void qc.invalidateQueries({ queryKey: ["documents", documentId] });
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
    onMutate: async (variables) => {
      const docKey = ["documents", variables.documentId];
      // 1. Cancel outgoing refetches
      await qc.cancelQueries({ queryKey: docKey });
      
      // 2. Snapshot previous value
      const previousDoc = qc.getQueryData(docKey);
      
      // 3. Optimistically update
      if (previousDoc) {
        qc.setQueryData(docKey, {
          ...(previousDoc as DriveDocument),
          isStarred: variables.starred,
        });
      }
      
      // Do the same for all drive lists
      await qc.cancelQueries({ queryKey: ["drive"] });
      qc.setQueriesData(
        { queryKey: ["drive"] },
        (old: DriveContents | undefined) => {
          if (!old) return old;
          return {
            ...old,
            documents: old.documents.map((d) =>
              d.id === variables.documentId
                ? { ...d, isStarred: variables.starred }
                : d,
            ),
          };
        },
      );

      return { previousDoc, docKey };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousDoc) qc.setQueryData(context.docKey, context.previousDoc);
      void qc.invalidateQueries({ queryKey: ["drive"] });
    },
    onSettled: (_, __, variables) => {
      void qc.invalidateQueries({ queryKey: ["documents", variables.documentId] });
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
