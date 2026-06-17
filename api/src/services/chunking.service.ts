import { runConcurrent } from "../utils/concurrency";
import * as aiService from "./ai/ai.service";

const SEMANTIC_BREAK_PERCENTILE = 25; // cắt ở 25% gap ít giống nhất của tài liệu
const MAX_BREAK_SIMILARITY = 0.9; // guard: không cắt khi câu vẫn rất giống (tài liệu liền mạch)
const MAX_CHUNK_CHARS = 3000;
const MIN_SENTENCES_PER_CHUNK = 2;
const SENTENCE_EMBED_BATCH = 50;
const SENTENCE_EMBED_CONCURRENCY = 4;

const DOT = "\x00DOT\x00";
// Viết tắt kết thúc bằng dấu chấm — không coi là ranh giới câu (tiếng Việt + Anh học thuật).
const ABBREV = [
  "TS", "ThS", "GS", "PGS", "BS", "KS", "TP", "Tp", "ĐH", "CĐ", "Nxb", "NXB",
  "tr", "vd", "VD", "Mr", "Mrs", "Ms", "Dr", "Prof", "etc", "No", "Fig", "Vol", "St",
];

export interface TextChunk {
  content: string;
  chunkIndex: number;
  pageNumber: number | null;
}

/** Thay dấu chấm KHÔNG phải ranh giới câu bằng sentinel để regex split không cắt nhầm. */
function protectDots(s: string): string {
  let out = s.replace(/(\d)\.(\d)/g, `$1${DOT}$2`); // số thập phân 3.14
  out = out.replace(/(^|\s)(\d{1,2})\.\s/g, `$1$2${DOT} `); // list đánh số "1. ", "2. "
  out = out.replace(/\bv\.v\.?/gi, `v${DOT}v${DOT}`); // v.v.
  for (const a of ABBREV) {
    out = out.replace(new RegExp(`\\b${a}\\.`, "g"), `${a}${DOT}`);
  }
  return out;
}

function splitIntoSentences(text: string): string[] {
  const PARA = "\x00PARA\x00";
  const normalised = protectDots(
    text
      .replace(/\r\n/g, "\n")
      .replace(/\n{2,}/g, PARA)
      .replace(/\n/g, " ")
      .replace(/[ \t]+/g, " ")
      .trim(),
  );

  const result: string[] = [];
  for (const para of normalised.split(PARA)) {
    for (const part of para.split(/(?<=[.?!])\s+/)) {
      const s = part.replace(new RegExp(DOT, "g"), ".").trim();
      if (s.length > 0) result.push(s);
    }
  }
  return result;
}

async function embedSentencesInBatches(sentences: string[]): Promise<number[][]> {
  const batches: string[][] = [];
  for (let i = 0; i < sentences.length; i += SENTENCE_EMBED_BATCH) {
    batches.push(sentences.slice(i, i + SENTENCE_EMBED_BATCH));
  }
  const results = await runConcurrent(batches, SENTENCE_EMBED_CONCURRENCY, (b) =>
    aiService.embedBatch(b, "similarity"),
  );
  return results.flat();
}

function dotProduct(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] ?? 0) * (b[i] ?? 0);
  return sum;
}

function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  const idx = Math.min(sortedAsc.length - 1, Math.floor((p / 100) * (sortedAsc.length - 1)));
  return sortedAsc[idx]!;
}

function findSemanticBreaks(embeddings: number[][]): Set<number> {
  const sims: number[] = [];
  for (let i = 1; i < embeddings.length; i++) {
    sims.push(dotProduct(embeddings[i - 1]!, embeddings[i]!));
  }

  const sorted = [...sims].sort((a, b) => a - b);
  // Ngưỡng tự co theo phân bố của chính tài liệu, nhưng không vượt MAX_BREAK_SIMILARITY
  // → tài liệu liền mạch (sim đều cao) gần như không bị cắt; tài liệu đa chủ đề cắt đúng chỗ tụt.
  const threshold = Math.min(percentile(sorted, SEMANTIC_BREAK_PERCENTILE), MAX_BREAK_SIMILARITY);

  const breaks = new Set<number>([0]);
  for (let i = 1; i < embeddings.length; i++) {
    if (sims[i - 1]! < threshold) breaks.add(i);
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
