export type {
  PublicDocumentSort,
  PublicLibrarySource,
  PublicDocument,
  PublicMatchType,
} from "@/lib/queries/public-documents";

export {
  isSuggestedDocument,
  isSuggestedDocument as isForumDocument,
} from "@/lib/queries/public-documents";

/** @deprecated Use PublicDocumentSort */
export type InternalDocumentSort = import("@/lib/queries/public-documents").PublicDocumentSort;
/** @deprecated Use PublicLibrarySource */
export type InternalSource = import("@/lib/queries/public-documents").PublicLibrarySource;
/** @deprecated Use PublicDocument */
export type InternalDocument = import("@/lib/queries/public-documents").PublicDocument;
/** @deprecated Use PublicMatchType */
export type ForumMatchType = import("@/lib/queries/public-documents").PublicMatchType;
/** @deprecated Use PublicDocument */
export type ForumDocument = import("@/lib/queries/public-documents").PublicDocument;
