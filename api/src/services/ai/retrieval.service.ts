import type { Types } from "mongoose";

import { DocumentChunk } from "../../models/document-chunk.model";
import { analyzeQuery } from "./reference-utils";
import type { RetrievedChunk } from "./citation-utils";

const LEXICAL_LIMIT = 16;

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

export interface RetrievalDebugEntry {
  source: "vector" | "lexical";
  documentId: string;
  chunkIndex: number | null;
  pageNumber: number | null;
  sectionPath: string[];
  heading: string | null;
  score: number;
}

export interface RetrievalDebugInfo {
  analysis: ReturnType<typeof analyzeQuery>;
  vectorHits: RetrievalDebugEntry[];
  lexicalHits: RetrievalDebugEntry[];
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
      const chunk: RetrievedChunk = {
        documentId: doc.documentId as Types.ObjectId,
        content: doc.content,
        queryText: String(doc.queryText ?? "").toLowerCase(),
        pageNumber: (doc.pageNumber as number | null) ?? null,
        score: normalizeLexicalScore(baseScore),
        lexicalScore: baseScore,
        sectionPath: (doc.sectionPath as string[] | undefined) ?? [],
        displayHeading: (doc.displayHeading as string | null | undefined) ?? null,
        blockType: String(doc.blockType ?? "paragraph"),
        extractionMode: String(doc.extractionMode ?? "text"),
        extractionConfidence: String(doc.extractionConfidence ?? "medium"),
      };
      if (typeof doc.chunkIndex === "number") {
        chunk.chunkIndex = doc.chunkIndex;
      }
      return chunk;
    })
    .sort((a, b) => b.score - a.score);

  return { chunks, analysis };
}

export function mergeRetrievedChunks(
  vectorChunks: RetrievedChunk[],
  lexicalChunks: RetrievedChunk[],
): RetrievedChunk[] {
  const merged = new Map<string, RetrievedChunk>();

  for (const chunk of vectorChunks) {
    const key = `${chunk.documentId.toString()}:${chunk.chunkIndex ?? chunk.pageNumber ?? "n"}`;
    merged.set(key, chunk);
  }

  for (const chunk of lexicalChunks) {
    const key = `${chunk.documentId.toString()}:${chunk.chunkIndex ?? chunk.pageNumber ?? "n"}`;
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

export function buildRetrievalDebugInfo(
  analysis: ReturnType<typeof analyzeQuery>,
  vectorChunks: RetrievedChunk[],
  lexicalChunks: RetrievedChunk[],
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
  });

  return {
    analysis,
    vectorHits: vectorChunks.slice(0, 8).map((chunk) => mapEntry("vector", chunk)),
    lexicalHits: lexicalChunks.slice(0, 8).map((chunk) => mapEntry("lexical", chunk)),
  };
}
