import type { Pagination } from "@/lib/queries/admin";

export type InternalDocumentSort = "newest" | "oldest" | "title";

export type InternalDocumentStatus =
  | "pending"
  | "processing"
  | "ready"
  | "failed";

export interface InternalMajorRef {
  id: string;
  code: string;
  name: string;
}

export interface InternalSubjectRef {
  id: string;
  code: string;
  name: string;
}

export interface InternalCurriculumRef {
  id: string;
  semesterNumber: number;
  major: InternalMajorRef | null;
  subject: InternalSubjectRef | null;
}

export interface InternalOwnerRef {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface InternalDocument {
  id: string;
  title: string;
  originalFilename: string;
  mimeType: string;
  fileSizeBytes: number;
  status: InternalDocumentStatus;
  pageCount: number | null;
  tags: string[];
  visibility: "internal";
  curriculumCourse: InternalCurriculumRef | null;
  owner: InternalOwnerRef | null;
  createdAt: string;
  updatedAt: string;
  downloadUrl?: string;
}

export interface InternalDocumentsResponse {
  documents: InternalDocument[];
  pagination: Pagination;
}

export interface InternalListParams {
  page: number;
  limit: number;
  search?: string;
  majorId?: string;
  semesterNumber?: number;
  subjectId?: string;
  sort?: InternalDocumentSort;
}

export type InternalSource = "forum" | "library";
