import type {
  DocumentSort,
  DriveDocument,
  PublicMatchType,
} from "@/lib/queries/drive";

/**
 * Public documents (Diễn đàn / Thư viện) share the unified document list shape
 * returned by `GET /api/documents`. These aliases keep the forum components
 * decoupled from the drive query module while pointing at one source of truth.
 */

export type InternalDocumentSort = DocumentSort;
export type InternalSource = "forum" | "library";

export type InternalDocument = DriveDocument;

export type ForumMatchType = PublicMatchType;
/** Public documents always carry a `matchType`; alias kept for readability. */
export type ForumDocument = DriveDocument;
