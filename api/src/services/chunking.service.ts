import * as aiService from "./ai/ai.service";

const SIMILARITY_THRESHOLD = 0.72;
const MAX_CHUNK_CHARS = 3000;
const MIN_SENTENCES_PER_CHUNK = 2;
const SENTENCE_EMBED_BATCH = 50;

export interface TextChunk {
  content: string;
  chunkIndex: number;
  pageNumber: number | null;
}

function splitIntoSentences(text: string): string[] {
  const PARA = "\x00PARA\x00";
  const normalised = text
    .replace(/\r\n/g, "\n")
    .replace(/\n{2,}/g, PARA)
    .replace(/\n/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();

  const result: string[] = [];
  for (const para of normalised.split(PARA)) {
    for (const part of para.split(/(?<=[.?!])\s+/)) {
      const s = part.trim();
      if (s.length > 0) result.push(s);
    }
  }
  return result;
}

async function embedSentencesInBatches(sentences: string[]): Promise<number[][]> {
  const all: number[][] = [];
  for (let i = 0; i < sentences.length; i += SENTENCE_EMBED_BATCH) {
    const embeddings = await aiService.embedBatch(
      sentences.slice(i, i + SENTENCE_EMBED_BATCH),
      "search_document",
    );
    all.push(...embeddings);
  }
  return all;
}

function dotProduct(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] ?? 0) * (b[i] ?? 0);
  return sum;
}

function findSemanticBreaks(embeddings: number[][]): Set<number> {
  const breaks = new Set<number>([0]);
  for (let i = 1; i < embeddings.length; i++) {
    if (dotProduct(embeddings[i - 1]!, embeddings[i]!) < SIMILARITY_THRESHOLD) {
      breaks.add(i);
    }
  }
  return breaks;
}

function groupSentencesIntoChunks(
  sentences: string[],
  breaksBefore: Set<number>,
  cleanText: string,
  pageCount: number | null,
): TextChunk[] {
  const chunks: TextChunk[] = [];
  let chunkIndex = 0;
  let groupStart = 0;

  const flush = (endExclusive: number) => {
    const content = sentences.slice(groupStart, endExclusive).join(" ").trim();
    if (!content) return;
    const charsBefore = sentences.slice(0, groupStart).join(" ").length;
    const midOffset = charsBefore + content.length / 2;
    const pageNumber =
      pageCount !== null ? Math.ceil((midOffset / cleanText.length) * pageCount) : null;
    chunks.push({ content, chunkIndex: chunkIndex++, pageNumber });
    groupStart = endExclusive;
  };

  for (let i = 1; i < sentences.length; i++) {
    const isBreak = breaksBefore.has(i);
    const currentChars = sentences.slice(groupStart, i).join(" ").length;
    const wouldExceedMax = currentChars + (sentences[i]?.length ?? 0) + 1 > MAX_CHUNK_CHARS;
    const hasMin = i - groupStart >= MIN_SENTENCES_PER_CHUNK;

    if ((isBreak && hasMin) || wouldExceedMax) flush(i);
  }
  flush(sentences.length);
  return chunks;
}

export async function chunkText(
  text: string,
  pageCount: number | null = null,
): Promise<TextChunk[]> {
  const sentences = splitIntoSentences(text);
  if (sentences.length === 0) return [];

  if (sentences.length < 3) {
    const content = sentences.join(" ").trim();
    return content ? [{ content, chunkIndex: 0, pageNumber: pageCount ? 1 : null }] : [];
  }

  const embeddings = await embedSentencesInBatches(sentences);
  const breaks = findSemanticBreaks(embeddings);
  return groupSentencesIntoChunks(sentences, breaks, sentences.join(" "), pageCount);
}
