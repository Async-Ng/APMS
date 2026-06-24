import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import type { Pagination } from "@/lib/queries/admin";
import { useAuthStore } from "@/stores/auth-store";

/* ── Shared document types ──────────────────────────────────── */

export type DocumentView = "my" | "shared" | "public" | "starred" | "trash";
export type DocumentVisibility = "private" | "public";
export type DocumentSource = "owned" | "shared" | "public";
export type DocumentSort = "newest" | "oldest" | "title";
export type PublicMatchType =
  | "exact_course"
  | "same_subject_other_semester"
  | "global_public";

export interface DocumentOwnerRef {
  id: string;
  displayName: string;
  email?: string;
  avatarUrl: string | null;
}

export interface DocumentMajorRef {
  id: string;
  code: string;
  name: string;
}

export interface DocumentSubjectRef {
  id: string;
  code: string;
  name: string;
}

export interface DocumentCurriculumRef {
  id: string;
  semesterNumber: number;
  major: DocumentMajorRef | null;
  subject: DocumentSubjectRef | null;
}

export interface DocumentShareRef {
  id: string;
  resourceType: "folder" | "document";
  resourceId: string;
  ownerId: string;
  sharedWithUserId: string;
  permission: "read";
  sharedAt: string;
}

export interface DriveFolder {
  id: string;
  ownerId?: string;
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
  ownerId?: string;
  title: string;
  originalFilename: string;
  mimeType: string;
  fileSizeBytes: number;
  status: "pending" | "processing" | "ready" | "failed";
  chunkCount?: number;
  pageCount?: number | null;
  folderId: string | null;
  curriculumCourseId?: string | null;
  visibility?: DocumentVisibility;
  isStarred: boolean;
  tags: string[];
  source?: DocumentSource;
  owner?: DocumentOwnerRef | null;
  curriculumCourse?: DocumentCurriculumRef | null;
  share?: DocumentShareRef | null;
  matchType?: PublicMatchType | null;
  deletedAt?: string | null;
  permanentDeleteAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DriveContents {
  folders: DriveFolder[];
  documents: DriveDocument[];
  pagination?: Pagination;
}

/* ── Unified document list ──────────────────────────────────── */

export interface ListDocumentsParams {
  view: DocumentView;
  parentId?: string | null;
  search?: string;
  sort?: DocumentSort;
  page?: number;
  limit?: number;
  match?: "auto" | "exact" | "related" | "all";
  majorId?: string;
  semesterNumber?: number;
  subjectId?: string;
}

function buildListQuery(params: ListDocumentsParams): Record<string, string | number> {
  const query: Record<string, string | number> = { view: params.view };
  if (params.parentId) query.parentId = params.parentId;
  if (params.search) query.search = params.search;
  if (params.sort) query.sort = params.sort;
  if (params.page) query.page = params.page;
  if (params.limit) query.limit = params.limit;
  if (params.match) query.match = params.match;
  if (params.majorId) query.majorId = params.majorId;
  if (params.semesterNumber !== undefined)
    query.semesterNumber = params.semesterNumber;
  if (params.subjectId) query.subjectId = params.subjectId;
  return query;
}

async function fetchDocuments(params: ListDocumentsParams): Promise<DriveContents> {
  const res = await api.get<{ status: string; data: DriveContents }>(
    "/documents",
    { params: buildListQuery(params) },
  );
  return res.data.data;
}

/** Drive workspace key prefix. Personal/shared views reuse this so document
 *  mutations keep their existing cache invalidations. */
export function driveKey(parentId?: string) {
  return ["drive", parentId ?? "root"] as const;
}

/** Root or folder contents — GET /api/documents?view=my&parentId= */
export function useDriveContents(parentId?: string) {
  return useQuery({
    queryKey: driveKey(parentId),
    queryFn: () => fetchDocuments({ view: "my", parentId: parentId ?? null }),
  });
}

/** Starred items — GET /api/documents?view=starred */
export function useStarred() {
  return useQuery({
    queryKey: ["drive", "starred"],
    queryFn: () => fetchDocuments({ view: "starred" }),
  });
}

/** Trash items — GET /api/documents?view=trash */
export function useTrash() {
  return useQuery({
    queryKey: ["drive", "trash"],
    queryFn: () => fetchDocuments({ view: "trash" }),
  });
}

/** Shared-with-me folder contents — GET /api/documents?view=shared&parentId= */
export function useSharedFolderContents(parentId: string) {
  return useQuery({
    queryKey: ["drive", "shared", parentId],
    queryFn: () => fetchDocuments({ view: "shared", parentId }),
    enabled: !!parentId,
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
