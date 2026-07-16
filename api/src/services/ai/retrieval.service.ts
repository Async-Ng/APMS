import type { Types } from "mongoose";

import { DocumentChunk } from "../../models/document-chunk.model";
import { analyzeQuery, type QueryAnalysis } from "./reference-utils";
import type { RetrievedChunk } from "./citation-utils";

const LEXICAL_LIMIT = 16;
const COVERAGE_POOL_LIMIT = 160;

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildLexicalOrClauses(analysis: ReturnType<typeof analyzeQuery>): Record<string, unknown>[] {
  const clauses: Record<string, unknown>[] = [];

  if (analysis.sectionPath?.length) {
    clauses.push({ sectionPath: analysis.sectionPath });
    const sectionText = analysis.sectionPath.join(".");
    clauses.push({ displayHeading: { $regex: escapeRegex(sectionText), $options: "i" } });
    clauses.push({ content: { $regex: escapeRegex(sectionText), $options: "i" } });
  }

  if (analysis.pageNumber !== null) {
    clauses.push({ pageNumber: analysis.pageNumber });
  }

  for (const token of analysis.formulaTokens.slice(0, 6)) {
    clauses.push({ queryText: { $regex: escapeRegex(token), $options: "i" } });
  }

  for (const term of analysis.lexicalTerms.slice(0, 8)) {
    clauses.push({ content: { $regex: escapeRegex(term), $options: "i" } });
    clauses.push({ displayHeading: { $regex: escapeRegex(term), $options: "i" } });
  }

  return clauses;
}

function lexicalBoost(
  chunk: Pick<
    RetrievedChunk,
    "sectionPath" | "displayHeading" | "pageNumber" | "queryText" | "content"
  >,
  analysis: ReturnType<typeof analyzeQuery>,
): number {
  let score = 0;
  if (analysis.sectionPath?.length) {
    const exactSection =
      chunk.sectionPath.join(".") === analysis.sectionPath.join(".") ||
      chunk.displayHeading?.includes(analysis.sectionPath.join("."));
    if (exactSection) score += 3;
  }
  if (analysis.pageNumber !== null && chunk.pageNumber === analysis.pageNumber) {
    score += 1.5;
  }
  for (const token of analysis.formulaTokens) {
    if (chunk.queryText.includes(token)) score += 1.25;
  }
  for (const term of analysis.lexicalTerms) {
    if (chunk.queryText.includes(term.toLowerCase())) score += 0.5;
  }
  return score;
}

/**
 * Lexical boost scores are an unbounded additive scale (section +3, page +1.5,
 * formula token +1.25, term +0.5 each) — not comparable to the ~0-1 cosine-like
 * vectorSearch score. Saturate into 0-1 so a lexical-only chunk's display/sort
 * `score` doesn't outrank genuinely stronger vector matches.
 */
function normalizeLexicalScore(raw: number): number {
  return raw / (raw + 3);
}

function chunkIdentity(chunk: RetrievedChunk): string {
  return `${chunk.documentId.toString()}:${chunk.chunkIndex ?? chunk.pageNumber ?? "n"}`;
}

function mapDocumentChunk(doc: {
  documentId: Types.ObjectId;
  content: string;
  queryText?: string | null;
  pageNumber?: number | null;
  chunkIndex?: number;
  sectionPath?: string[];
  displayHeading?: string | null;
  blockType?: string | null;
  extractionMode?: string | null;
  extractionConfidence?: string | null;
  score?: number;
}): RetrievedChunk {
  const chunk: RetrievedChunk = {
    documentId: doc.documentId,
    content: doc.content,
    queryText: String(doc.queryText ?? "").toLowerCase(),
    pageNumber: doc.pageNumber ?? null,
    score: doc.score ?? 0,
    sectionPath: doc.sectionPath ?? [],
    displayHeading: doc.displayHeading ?? null,
    blockType: String(doc.blockType ?? "paragraph"),
    extractionMode: String(doc.extractionMode ?? "text"),
    extractionConfidence: String(doc.extractionConfidence ?? "medium"),
  };
  if (typeof doc.chunkIndex === "number") {
    chunk.chunkIndex = doc.chunkIndex;
  }
  return chunk;
}

export function buildKeywordQuery(query: string, analysis: QueryAnalysis): string {
  const focusedTerms = [
    ...(analysis.sectionPath?.length ? [analysis.sectionPath.join(".")] : []),
    ...(analysis.pageNumber !== null ? [`page ${analysis.pageNumber}`] : []),
    ...analysis.formulaTokens,
    ...analysis.lexicalTerms,
  ]
    .map((term) => term.trim())
    .filter((term) => term.length > 0);

  const uniqueTerms = [...new Set(focusedTerms)].slice(0, 10);
  return uniqueTerms.length > 0 ? uniqueTerms.join(" ") : query;
}

export function uniqueQueryVariants(variants: string[], limit: number): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const variant of variants) {
    const cleaned = variant.replace(/\s+/g, " ").trim();
    const key = cleaned.toLocaleLowerCase();
    if (!cleaned || seen.has(key)) continue;
    seen.add(key);
    result.push(cleaned);
    if (result.length >= limit) break;
  }

  return result;
}

export interface RetrievalDebugEntry {
  source: "vector" | "lexical";
  documentId: string;
  chunkIndex: number | null;
  pageNumber: number | null;
  sectionPath: string[];
  heading: string | null;
  score: number;
  vectorScore?: number;
  lexicalScore?: number;
  rerankScore?: number;
  hybridScore?: number;
}

export interface RetrievalDebugInfo {
  analysis: QueryAnalysis;
  queryVariants: string[];
  vectorHits: RetrievalDebugEntry[];
  lexicalHits: RetrievalDebugEntry[];
  selectedContext: Array<RetrievalDebugEntry & { sourceIndex: number }>;
  evidenceGate: {
    passed: boolean;
    reason: string | null;
  };
}

export async function findLexicalChunks(
  baseFilter: Record<string, unknown>,
  rawQuery: string,
): Promise<{ chunks: RetrievedChunk[]; analysis: ReturnType<typeof analyzeQuery> }> {
  const analysis = analyzeQuery(rawQuery);
  const orClauses = buildLexicalOrClauses(analysis);
  if (orClauses.length === 0) {
    return { chunks: [], analysis };
  }

  const docs = await DocumentChunk.find({
    ...baseFilter,
    $or: orClauses,
  })
    .select(
      "documentId content queryText pageNumber chunkIndex sectionPath displayHeading blockType extractionMode extractionConfidence",
    )
    .limit(LEXICAL_LIMIT)
    .lean();

  const chunks = docs
    .map((doc) => {
      const baseScore = lexicalBoost(
        {
          sectionPath: doc.sectionPath ?? [],
          displayHeading: doc.displayHeading ?? null,
          pageNumber: doc.pageNumber ?? null,
          queryText: String(doc.queryText ?? "").toLowerCase(),
          content: doc.content,
        },
        analysis,
      );
      const mapped = mapDocumentChunk({
        documentId: doc.documentId as Types.ObjectId,
        content: doc.content,
        queryText: doc.queryText,
        pageNumber: (doc.pageNumber as number | null) ?? null,
        sectionPath: (doc.sectionPath as string[] | undefined) ?? [],
        displayHeading: (doc.displayHeading as string | null | undefined) ?? null,
        blockType: String(doc.blockType ?? "paragraph"),
        extractionMode: String(doc.extractionMode ?? "text"),
        extractionConfidence: String(doc.extractionConfidence ?? "medium"),
        score: normalizeLexicalScore(baseScore),
      });
      if (typeof doc.chunkIndex === "number") {
        mapped.chunkIndex = doc.chunkIndex;
      }
      return {
        ...mapped,
        lexicalScore: baseScore,
      };
    })
    .sort((a, b) => b.score - a.score);

  return { chunks, analysis };
}

export async function findCoverageChunks(
  baseFilter: Record<string, unknown>,
  limit: number,
): Promise<RetrievedChunk[]> {
  if (limit <= 0) return [];

  const docs = await DocumentChunk.find(baseFilter)
    .select(
      "documentId content queryText pageNumber chunkIndex sectionPath displayHeading blockType extractionMode extractionConfidence",
    )
    .sort({ documentId: 1, chunkIndex: 1 })
    .limit(COVERAGE_POOL_LIMIT)
    .lean();

  if (docs.length === 0) return [];

  const chunks = docs.map((doc) => {
    const mapped = mapDocumentChunk({
      documentId: doc.documentId as Types.ObjectId,
      content: doc.content,
      queryText: doc.queryText,
      pageNumber: (doc.pageNumber as number | null) ?? null,
      sectionPath: (doc.sectionPath as string[] | undefined) ?? [],
      displayHeading: (doc.displayHeading as string | null | undefined) ?? null,
      blockType: String(doc.blockType ?? "paragraph"),
      extractionMode: String(doc.extractionMode ?? "text"),
      extractionConfidence: String(doc.extractionConfidence ?? "medium"),
      score: 0.5,
    });
    if (typeof doc.chunkIndex === "number") {
      mapped.chunkIndex = doc.chunkIndex;
    }
    return mapped;
  });

  const selected: RetrievedChunk[] = [];
  const seenPages = new Set<string>();
  const headingChunks = chunks.filter((chunk) => chunk.displayHeading || chunk.blockType === "heading");

  for (const chunk of headingChunks) {
    if (selected.length >= limit) break;
    const key = chunkIdentity(chunk);
    if (selected.some((existing) => chunkIdentity(existing) === key)) continue;
    selected.push({ ...chunk, lexicalScore: chunk.lexicalScore ?? 0.75 });
  }

  for (const chunk of chunks) {
    if (selected.length >= limit) break;
    const pageKey = `${chunk.documentId.toString()}:${chunk.pageNumber ?? chunk.chunkIndex ?? "n"}`;
    if (seenPages.has(pageKey)) continue;
    seenPages.add(pageKey);
    const key = chunkIdentity(chunk);
    if (selected.some((existing) => chunkIdentity(existing) === key)) continue;
    selected.push({ ...chunk, lexicalScore: chunk.lexicalScore ?? 0.5 });
  }

  return selected;
}

export function mergeRetrievedChunks(
  vectorChunks: RetrievedChunk[],
  lexicalChunks: RetrievedChunk[],
): RetrievedChunk[] {
  const merged = new Map<string, RetrievedChunk>();

  for (const chunk of vectorChunks) {
    merged.set(chunkIdentity(chunk), chunk);
  }

  for (const chunk of lexicalChunks) {
    const key = chunkIdentity(chunk);
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, chunk);
      continue;
    }

    const mergedLexicalScore = chunk.lexicalScore ?? existing.lexicalScore;

    merged.set(key, {
      ...existing,
      // Keep the vector-side score as the display/sort score — do not let an
      // unbounded lexical boost score inflate it (see normalizeLexicalScore).
      score: existing.vectorScore ?? existing.score,
      ...(mergedLexicalScore !== undefined ? { lexicalScore: mergedLexicalScore } : {}),
      queryText: existing.queryText || chunk.queryText,
      sectionPath: existing.sectionPath.length > 0 ? existing.sectionPath : chunk.sectionPath,
      displayHeading: existing.displayHeading ?? chunk.displayHeading,
      blockType: existing.blockType ?? chunk.blockType,
      extractionMode: existing.extractionMode ?? chunk.extractionMode,
      extractionConfidence: existing.extractionConfidence ?? chunk.extractionConfidence,
    });
  }

  return [...merged.values()];
}

export function scoreRetrievedChunks(
  chunks: RetrievedChunk[],
  analysis: QueryAnalysis,
): RetrievedChunk[] {
  return chunks.map((chunk) => {
    const vectorScore = chunk.vectorScore ?? 0;
    const lexicalScore = chunk.lexicalScore ? normalizeLexicalScore(chunk.lexicalScore) : 0;
    let exactBoost = 0;

    if (analysis.pageNumber !== null && chunk.pageNumber === analysis.pageNumber) {
      exactBoost += 0.16;
    }
    if (analysis.sectionPath?.length) {
      const expected = analysis.sectionPath.join(".");
      if (
        chunk.sectionPath.join(".") === expected ||
        chunk.displayHeading?.toLocaleLowerCase().includes(expected)
      ) {
        exactBoost += 0.18;
      }
    }
    if (analysis.formulaTokens.some((token) => chunk.queryText.includes(token))) {
      exactBoost += 0.14;
    }

    const rerankBoost = chunk.rerankScore !== undefined ? chunk.rerankScore / 10 : 0;
    const hybridScore = Math.min(
      1,
      vectorScore * 0.5 + lexicalScore * 0.25 + rerankBoost * 0.2 + exactBoost,
    );

    return {
      ...chunk,
      hybridScore,
      score: hybridScore || chunk.score,
    };
  });
}

export function selectDiverseChunks(
  chunks: RetrievedChunk[],
  limit: number,
): RetrievedChunk[] {
  const ranked = [...chunks].sort(
    (a, b) => (b.hybridScore ?? b.score) - (a.hybridScore ?? a.score),
  );
  const selected: RetrievedChunk[] = [];
  const pageCounts = new Map<string, number>();
  const sectionCounts = new Map<string, number>();

  for (const chunk of ranked) {
    if (selected.length >= limit) break;

    const pageKey = `${chunk.documentId.toString()}:${chunk.pageNumber ?? "n"}`;
    const sectionKey = `${chunk.documentId.toString()}:${chunk.sectionPath.join(".") || "n"}`;
    const pageCount = pageCounts.get(pageKey) ?? 0;
    const sectionCount = sectionCounts.get(sectionKey) ?? 0;
    const strongExact =
      (chunk.vectorScore ?? 0) >= 0.7 ||
      (chunk.lexicalScore ?? 0) >= 2 ||
      chunk.rerankScore !== undefined && chunk.rerankScore >= 8;

    if (!strongExact && (pageCount >= 2 || sectionCount >= 3)) continue;

    selected.push(chunk);
    pageCounts.set(pageKey, pageCount + 1);
    sectionCounts.set(sectionKey, sectionCount + 1);
  }

  if (selected.length >= limit) return selected;

  for (const chunk of ranked) {
    if (selected.length >= limit) break;
    if (selected.some((existing) => chunkIdentity(existing) === chunkIdentity(chunk))) continue;
    selected.push(chunk);
  }

  return selected;
}

export function buildRetrievalDebugInfo(
  analysis: QueryAnalysis,
  queryVariants: string[],
  vectorChunks: RetrievedChunk[],
  lexicalChunks: RetrievedChunk[],
  selectedContext: RetrievedChunk[],
  evidenceGate: RetrievalDebugInfo["evidenceGate"],
): RetrievalDebugInfo {
  const mapEntry = (
    source: "vector" | "lexical",
    chunk: RetrievedChunk,
  ): RetrievalDebugEntry => ({
    source,
    documentId: chunk.documentId.toString(),
    chunkIndex: chunk.chunkIndex ?? null,
    pageNumber: chunk.pageNumber ?? null,
    sectionPath: chunk.sectionPath,
    heading: chunk.displayHeading,
    score: chunk.score,
    ...(chunk.vectorScore !== undefined ? { vectorScore: chunk.vectorScore } : {}),
    ...(chunk.lexicalScore !== undefined ? { lexicalScore: chunk.lexicalScore } : {}),
    ...(chunk.rerankScore !== undefined ? { rerankScore: chunk.rerankScore } : {}),
    ...(chunk.hybridScore !== undefined ? { hybridScore: chunk.hybridScore } : {}),
  });

  return {
    analysis,
    queryVariants,
    vectorHits: vectorChunks.slice(0, 8).map((chunk) => mapEntry("vector", chunk)),
    lexicalHits: lexicalChunks.slice(0, 8).map((chunk) => mapEntry("lexical", chunk)),
    selectedContext: selectedContext.slice(0, 12).map((chunk, index) => ({
      ...mapEntry(chunk.vectorScore !== undefined ? "vector" : "lexical", chunk),
      sourceIndex: index + 1,
    })),
    evidenceGate,
  };
}
