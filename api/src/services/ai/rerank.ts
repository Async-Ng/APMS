import type { RetrievedChunk } from "./citation-utils";
import * as geminiProvider from "./gemini.provider";

/** Max characters of each chunk shown to the reranker (keep the prompt small). */
const RERANK_SNIPPET_CHARS = 600;

interface RerankScore {
  index: number;
  score: number;
}

function parseRerankResponse(raw: string): RerankScore[] {
  // The model may wrap JSON in code fences despite responseMimeType — strip them.
  const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const parsed = JSON.parse(cleaned) as unknown;
  if (!Array.isArray(parsed)) return [];

  const scores: RerankScore[] = [];
  for (const entry of parsed) {
    if (typeof entry !== "object" || entry === null) continue;
    const index = Number((entry as Record<string, unknown>).index);
    const score = Number((entry as Record<string, unknown>).score);
    if (Number.isInteger(index) && Number.isFinite(score)) {
      scores.push({ index, score });
    }
  }
  return scores;
}

/**
 * Rerank retrieved chunks by relevance to the query using a lightweight Gemini
 * model, then return the top `topN`. Falls back to the original vector-score
 * order on any error so the chat flow never breaks.
 */
export async function rerankChunks(
  query: string,
  chunks: RetrievedChunk[],
  topN: number,
): Promise<RetrievedChunk[]> {
  if (chunks.length <= 1) return chunks.slice(0, topN);

  const numbered = chunks
    .map(
      (chunk, i) =>
        `[${i}] ${chunk.content.slice(0, RERANK_SNIPPET_CHARS).replace(/\s+/g, " ")}`,
    )
    .join("\n\n");

  const prompt = `You are a relevance ranking system. Score how well each numbered passage answers the user's question, from 0 (irrelevant) to 10 (directly answers it).

Question: ${query}

Passages:
${numbered}

Return ONLY a JSON array, one object per passage: [{"index": <number>, "score": <0-10>}]. Include every passage index.`;

  try {
    const raw = await geminiProvider.generateLite(prompt, {
      json: true,
      maxOutputTokens: 1024,
    });
    const scores = parseRerankResponse(raw);
    if (scores.length === 0) return chunks.slice(0, topN);

    const scoreByIndex = new Map(scores.map((s) => [s.index, s.score]));
    return [...chunks]
      .map((chunk, i) => ({ chunk, rank: scoreByIndex.get(i) ?? -1 }))
      .sort((a, b) => b.rank - a.rank || b.chunk.score - a.chunk.score)
      .slice(0, topN)
      .map((entry) => entry.chunk);
  } catch (error) {
    console.warn(
      `[rerank] failed, using vector order: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return chunks.slice(0, topN);
  }
}
