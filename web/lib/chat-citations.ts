import type { ChatCitation } from "@/lib/queries/chat";

export function getCitationKey(citation: ChatCitation): string {
  if (citation.sourceIndex != null && citation.chunkIndex != null) {
    return `${citation.sourceIndex}-${citation.documentId}-${citation.chunkIndex}`;
  }
  if (citation.chunkIndex != null) {
    return `${citation.documentId}-${citation.chunkIndex}`;
  }
  return `${citation.documentId}-${citation.pageNumber ?? "n"}-${citation.excerpt.slice(0, 32)}`;
}

export function getCitationDeepLink(citation: ChatCitation): string {
  if (citation.deepLink) return citation.deepLink;

  const params = new URLSearchParams({ from: "chat" });
  if (citation.pageNumber != null) params.set("page", String(citation.pageNumber));
  if (citation.chunkIndex != null) params.set("chunkIndex", String(citation.chunkIndex));
  const query = params.toString();
  return `/documents/${citation.documentId}${query ? `?${query}` : ""}`;
}
