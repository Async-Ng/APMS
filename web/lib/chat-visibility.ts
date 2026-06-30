import type { ChatCitation, ChatSession } from "@/lib/queries/chat";

export const DELETED_CONTEXT_SUFFIX = " (đã xóa)";
export const MISSING_DOC_TITLE = "Tài liệu không còn tồn tại";

export function isDeletedContextTitle(title: string | null | undefined): boolean {
  if (!title) return false;
  return title === MISSING_DOC_TITLE || title.endsWith(DELETED_CONTEXT_SUFFIX);
}

export function filterVisibleChatSessions(sessions: ChatSession[]): ChatSession[] {
  return sessions.filter((session) => {
    if (session.contextType === "all") return true;

    if (session.contextType === "document" || session.contextType === "folder") {
      return !isDeletedContextTitle(session.contextLabel);
    }

    if (session.contextType === "documents") {
      const docs = session.contextDocuments ?? [];
      if (docs.length === 0) return !isDeletedContextTitle(session.contextLabel);
      return docs.some((doc) => !isDeletedContextTitle(doc.title));
    }

    return true;
  });
}

export function filterVisibleContextDocuments<T extends { id: string; title: string }>(
  documents: T[],
): T[] {
  return documents.filter((doc) => !isDeletedContextTitle(doc.title));
}

export function filterVisibleCitations(
  citations: ChatCitation[],
  hiddenDocumentIds: ReadonlySet<string>,
): ChatCitation[] {
  if (hiddenDocumentIds.size === 0) return citations;
  return citations.filter((c) => !hiddenDocumentIds.has(c.documentId));
}
