import type { Types } from "mongoose";

export interface RetrievedChunk {
  documentId: Types.ObjectId;
  content: string;
  queryText: string;
  pageNumber: number | null;
  /** Display/sort score: vectorScore when available, else a normalized lexicalScore. */
  score: number;
  /** Raw cosine-like score (~0-1) from $vectorSearch, if this chunk matched the vector pool. */
  vectorScore?: number;
  /** Raw additive lexical boost score (unbounded), if this chunk matched the lexical pool. */
  lexicalScore?: number;
  /** Score returned by the LLM reranker on a 0-10 scale, when available. */
  rerankScore?: number;
  /** Combined retrieval score used for context selection and debug output. */
  hybridScore?: number;
  sectionPath: string[];
  displayHeading: string | null;
  blockType: string;
  extractionMode: string;
  extractionConfidence: string;
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
  chunkIndex: number | null;
  pageNumber: number | null;
  sectionPath: string[];
  heading: string | null;
  blockType: string;
  extractionMode: string;
  extractionConfidence: string;
  excerpt: string;
}

const CITATION_REF_RE = /\[(\d+)\]/g;
const CITATION_GROUP_RE = /\[((?:(?:(?:source|s)\s*)?\d+\s*,?\s*)+)\]/gi;
const CITATION_INDEX_RE = /(?:(?:source|s)\s*)?(\d+)/gi;

function parseCitationGroup(rawGroup: string): number[] {
  const indices: number[] = [];

  for (const match of rawGroup.matchAll(CITATION_INDEX_RE)) {
    const index = Number.parseInt(match[1] ?? "", 10);
    if (Number.isFinite(index) && index > 0) {
      indices.push(index);
    }
  }

  return indices;
}

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
      chunkIndex: chunk.chunkIndex ?? null,
      pageNumber: chunk.pageNumber ?? null,
      sectionPath: chunk.sectionPath,
      heading: chunk.displayHeading,
      blockType: chunk.blockType,
      extractionMode: chunk.extractionMode,
      extractionConfidence: chunk.extractionConfidence,
      excerpt: (chunk.citationExcerpt ?? chunk.content).slice(0, excerptLength),
    });
  }

  return citations;
}

export function normalizeCitationMarkers(
  assistantText: string,
  chunks: RetrievedChunk[],
): string {
  const validSourceIndices = new Set(chunks.map((_, index) => index + 1));

  return assistantText
    .replace(CITATION_GROUP_RE, (_match, rawGroup: string) => {
      const validIndices = parseCitationGroup(rawGroup).filter((index) =>
        validSourceIndices.has(index),
      );
      if (validIndices.length === 0) return "";
      return validIndices.map((index) => `[${index}]`).join(" ");
    })
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+([,.;:!?])/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
