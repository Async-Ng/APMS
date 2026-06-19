import type { Types } from "mongoose";

export interface RetrievedChunk {
  documentId: Types.ObjectId;
  content: string;
  pageNumber: number | null;
  score: number;
  /** Position of the chunk within its document; used for neighbor expansion. */
  chunkIndex?: number;
  /**
   * Excerpt of the original matched chunk (before neighbor expansion). When set,
   * citations use this rather than the expanded `content`.
   */
  citationExcerpt?: string;
}

export interface BuiltCitation {
  sourceIndex: number;
  documentId: Types.ObjectId;
  documentTitle: string;
  pageNumber: number | null;
  excerpt: string;
}

const CITATION_REF_RE = /\[(\d+)\]/g;

/** Extract unique source indices in order of first appearance. */
export function parseCitedSourceIndices(text: string): number[] {
  const seen = new Set<number>();
  const ordered: number[] = [];

  for (const match of text.matchAll(CITATION_REF_RE)) {
    const index = Number.parseInt(match[1] ?? "", 10);
    if (!Number.isFinite(index) || index < 1 || seen.has(index)) continue;
    seen.add(index);
    ordered.push(index);
  }

  return ordered;
}

export function buildCitationsFromResponse(
  assistantText: string,
  chunks: RetrievedChunk[],
  titleMap: Map<string, string>,
  excerptLength = 300,
): BuiltCitation[] {
  const citedIndices = parseCitedSourceIndices(assistantText);

  const indicesToUse =
    citedIndices.length > 0
      ? citedIndices
      : chunks
          .map((chunk, index) => ({ chunk, sourceIndex: index + 1 }))
          .sort((a, b) => b.chunk.score - a.chunk.score)
          .slice(0, 3)
          .map((entry) => entry.sourceIndex);

  const citations: BuiltCitation[] = [];

  for (const sourceIndex of indicesToUse) {
    const chunk = chunks[sourceIndex - 1];
    if (!chunk) continue;

    const docIdStr = chunk.documentId.toString();
    if (!titleMap.has(docIdStr)) continue;

    citations.push({
      sourceIndex,
      documentId: chunk.documentId,
      documentTitle: titleMap.get(docIdStr) ?? "",
      pageNumber: chunk.pageNumber ?? null,
      excerpt: (chunk.citationExcerpt ?? chunk.content).slice(0, excerptLength),
    });
  }

  return citations;
}
