import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import type {
  DocumentVisibility,
  DriveContents,
  DriveDocument,
} from "@/lib/queries/drive";
import { useAuthStore } from "@/stores/auth-store";

/* ── Types ─────────────────────────────────────────────────── */

interface UploadIntentBody {
  originalFilename: string;
  mimeType: string;
  fileSizeBytes: number;
  curriculumCourseId: string;
  visibility: DocumentVisibility;
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
    enabled: !!documentId,
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

/* ── Public documents (Diễn đàn / Thư viện) ─────────────────── */

export interface PublicDocumentsParams {
  match: "auto" | "all";
  page: number;
  limit: number;
  search?: string;
  sort?: "newest" | "oldest" | "title";
  majorId?: string;
  semesterNumber?: number;
  subjectId?: string;
}

export function usePublicDocuments(
  params: PublicDocumentsParams & { enabled?: boolean },
) {
  const { enabled = true, ...listParams } = params;
  return useQuery({
    queryKey: ["documents", "public", listParams],
    queryFn: async () => {
      const query: Record<string, string | number> = {
        view: "public",
        match: listParams.match,
        page: listParams.page,
        limit: listParams.limit,
      };
      if (listParams.search) query.search = listParams.search;
      if (listParams.sort) query.sort = listParams.sort;
      if (listParams.majorId) query.majorId = listParams.majorId;
      if (listParams.semesterNumber !== undefined)
        query.semesterNumber = listParams.semesterNumber;
      if (listParams.subjectId) query.subjectId = listParams.subjectId;

      const res = await api.get<{ status: string; data: DriveContents }>(
        "/documents",
        { params: query },
      );
      return res.data.data;
    },
    placeholderData: (prev) => prev,
    enabled,
  });
}

/* ── Document mutations ─────────────────────────────────────── */

export interface UpdateDocumentBody {
  title?: string;
  tags?: string[];
  folderId?: string | null;
  curriculumCourseId?: string;
  visibility?: DocumentVisibility;
}

export function useUpdateDocument(documentId: string, parentId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateDocumentBody) =>
      api.patch(`/documents/${documentId}`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["documents", documentId] });
      void qc.invalidateQueries({ queryKey: ["drive", parentId ?? "root"] });
      void qc.invalidateQueries({ queryKey: ["documents", "public"] });
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
      void qc.invalidateQueries({ queryKey: ["drive", "trash"] });
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
      void qc.invalidateQueries({ queryKey: ["drive", "root"] });
    },
  });
}

export function usePermanentDeleteDocument() {
  const qc = useQueryClient();
  const fetchMe = useAuthStore((state) => state.fetchMe);

  return useMutation({
    mutationFn: (documentId: string) =>
      api.delete(`/documents/${documentId}/permanent`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["drive", "trash"] });
      void fetchMe();
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
      await qc.cancelQueries({ queryKey: docKey });

      const previousDoc = qc.getQueryData(docKey);

      if (previousDoc) {
        qc.setQueryData(docKey, {
          ...(previousDoc as DriveDocument),
          isStarred: variables.starred,
        });
      }

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
      void qc.invalidateQueries({ queryKey: ["documents", "public"] });
    },
  });
}
