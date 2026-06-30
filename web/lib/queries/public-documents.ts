import type {
  DocumentSort,
  DriveDocument,
  PublicMatchType,
} from "@/lib/queries/drive";

/**
 * Public documents (gợi ý / duyệt thư viện công khai) share the unified document
 * list shape returned by `GET /api/documents?view=public`.
 */

export type PublicDocumentSort = DocumentSort;
export type PublicLibrarySource = "suggested" | "browse";

export type PublicDocument = DriveDocument;

export type { PublicMatchType };

export function isSuggestedDocument(doc: PublicDocument): boolean {
  return doc.matchType != null;
}

/** @deprecated Use PublicDocumentSort */
export type InternalDocumentSort = PublicDocumentSort;
/** @deprecated Use PublicLibrarySource */
export type InternalSource = PublicLibrarySource;
/** @deprecated Use PublicDocument */
export type InternalDocument = PublicDocument;
/** @deprecated Use PublicMatchType */
export type ForumMatchType = PublicMatchType;
/** @deprecated Use PublicDocument */
export type ForumDocument = PublicDocument;
/** @deprecated Use isSuggestedDocument */
export const isForumDocument = isSuggestedDocument;
