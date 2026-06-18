import type { TextSegment } from "./extraction/types";
import { runConcurrent } from "../utils/concurrency";
import * as aiService from "./ai/ai.service";

export const CHUNKING_MAX_CHARS = 1500;
export const CHUNKING_OVERLAP_CHARS = 150;
export const CHUNKING_MIN_CHARS = 400;
export const CHUNKING_MERGE_TAIL_CHARS = 200;

const SEMANTIC_BREAK_PERCENTILE = 20;
const MAX_BREAK_SIMILARITY = 0.9;
const SIMILARITY_DROP_DELTA = 0.05;
const MIN_UNITS_PER_CHUNK = 3;
const SENTENCE_EMBED_BATCH = 50;
const SENTENCE_EMBED_CONCURRENCY = 4;
const WINDOW_RADIUS = 2;

const DOT = "\x00DOT\x00";
const ABBREV = [
  "TS", "ThS", "GS", "PGS", "BS", "KS", "TP", "Tp", "ĐH", "CĐ", "Nxb", "NXB",
  "tr", "vd", "VD", "Mr", "Mrs", "Ms", "Dr", "Prof", "etc", "No", "Fig", "Vol", "St",
];

export interface TextChunk {
  content: string;
  chunkIndex: number;
  pageNumber: number | null;
}

function protectDots(s: string): string {
  let out = s.replace(/(\d)\.(\d)/g, `$1${DOT}$2`);
  out = out.replace(/(^|\s)(\d{1,2})\.\s/g, `$1$2${DOT} `);
  out = out.replace(/\bv\.v\.?/gi, `v${DOT}v${DOT}`);
  for (const a of ABBREV) {
    out = out.replace(new RegExp(`\\b${a}\\.`, "g"), `${a}${DOT}`);
  }
  return out;
}

function isNumberedHeading(line: string): boolean {
  return /^\d+(\.\d+)*\s+\S/.test(line);
}

function isAllCapsHeading(line: string): boolean {
  if (line.length > 80 || line.length < 3) return false;
  const letters = line.replace(/[^A-Za-zÀ-ỹ]/g, "");
  return letters.length > 0 && letters === letters.toUpperCase();
}

function isStructuralHeading(line: string): boolean {
  const trimmed = line.trim();
  return isNumberedHeading(trimmed) || isAllCapsHeading(trimmed);
}

function splitLineIntoSentences(line: string): string[] {
  const normalised = protectDots(line.replace(/[ \t]+/g, " ").trim());
  const result: string[] = [];
  for (const part of normalised.split(/(?<=[.?!])\s+/)) {
    const s = part.replace(new RegExp(DOT, "g"), ".").trim();
    if (s.length > 0) result.push(s);
  }
  return result;
}

/** Split segment text into semantic units (paragraphs, headings, sentences). */
function splitIntoUnits(text: string): string[] {
  const normalised = text.replace(/\r\n/g, "\n").trim();
  if (!normalised) return [];

  const units: string[] = [];
  const paragraphs = normalised.split(/\n{2,}/);

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    if (isStructuralHeading(trimmed)) {
      units.push(trimmed);
      continue;
    }

    const lines = trimmed.split(/\n/);
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      if (isStructuralHeading(line)) {
        units.push(line);
        continue;
      }

      const sentences = splitLineIntoSentences(line);
      if (sentences.length === 0) {
        units.push(line);
      } else {
        units.push(...sentences);
      }
    }
  }

  return units;
}

function findHardBreaks(units: string[]): Set<number> {
  const breaks = new Set<number>([0]);
  for (let i = 1; i < units.length; i++) {
    if (isStructuralHeading(units[i] ?? "")) {
      breaks.add(i);
    }
  }
  return breaks;
}

async function embedUnitsInBatches(units: string[]): Promise<number[][]> {
  const batches: string[][] = [];
  for (let i = 0; i < units.length; i += SENTENCE_EMBED_BATCH) {
    batches.push(units.slice(i, i + SENTENCE_EMBED_BATCH));
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

function meanEmbedding(embeddings: number[][], start: number, end: number): number[] {
  const dim = embeddings[0]?.length ?? 0;
  const mean = new Array<number>(dim).fill(0);
  let count = 0;
  for (let i = start; i <= end; i++) {
    const emb = embeddings[i];
    if (!emb) continue;
    for (let d = 0; d < dim; d++) mean[d] = (mean[d] ?? 0) + (emb[d] ?? 0);
    count++;
  }
  if (count === 0) return mean;
  for (let d = 0; d < dim; d++) mean[d] = (mean[d] ?? 0) / count;
  return mean;
}

function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  const idx = Math.min(sortedAsc.length - 1, Math.floor((p / 100) * (sortedAsc.length - 1)));
  return sortedAsc[idx]!;
}

function findSemanticBreaks(embeddings: number[][], hardBreaks: Set<number>): Set<number> {
  const breaks = new Set<number>(hardBreaks);
  if (embeddings.length < 3) return breaks;

  const windowSims: number[] = [];
  for (let i = 0; i < embeddings.length; i++) {
    const start = Math.max(0, i - WINDOW_RADIUS);
    const end = Math.min(embeddings.length - 1, i + WINDOW_RADIUS);
    const contextMean = meanEmbedding(embeddings, start, end);
    windowSims.push(dotProduct(embeddings[i]!, contextMean));
  }

  const adjSims: number[] = [];
  for (let i = 1; i < embeddings.length; i++) {
    adjSims.push(dotProduct(embeddings[i - 1]!, embeddings[i]!));
  }

  const sorted = [...adjSims].sort((a, b) => a - b);
  const threshold = Math.min(percentile(sorted, SEMANTIC_BREAK_PERCENTILE), MAX_BREAK_SIMILARITY);

  for (let i = 1; i < embeddings.length; i++) {
    const belowThreshold = (adjSims[i - 1] ?? 1) < threshold;
    const sharpDrop =
      i >= 2 &&
      (windowSims[i - 2] ?? 0) - (windowSims[i - 1] ?? 0) >= SIMILARITY_DROP_DELTA;

    if (belowThreshold || sharpDrop) {
      breaks.add(i);
    }
  }

  return breaks;
}

function takeOverlapTail(text: string): string {
  if (text.length <= CHUNKING_OVERLAP_CHARS) return text;
  const tail = text.slice(-CHUNKING_OVERLAP_CHARS);
  const spaceIdx = tail.indexOf(" ");
  return spaceIdx > 0 ? tail.slice(spaceIdx + 1) : tail;
}

function applySectionPrefix(content: string, sectionTitle: string | null): string {
  if (!sectionTitle?.trim()) return content;
  return `[${sectionTitle.trim()}]\n${content}`;
}

function groupUnitsIntoChunks(
  units: string[],
  breaksBefore: Set<number>,
  pageNumber: number | null,
): Omit<TextChunk, "chunkIndex">[] {
  const chunks: Omit<TextChunk, "chunkIndex">[] = [];
  let groupStart = 0;
  let overlapPrefix = "";
  let sectionTitle: string | null = null;

  const flush = (endExclusive: number) => {
    const slice = units.slice(groupStart, endExclusive);
    let body = slice.join(" ").trim();
    if (!body) return;

    if (overlapPrefix) {
      body = `${overlapPrefix} ${body}`.trim();
    }

    const content = applySectionPrefix(body, sectionTitle);
    chunks.push({ content, pageNumber });
    overlapPrefix = takeOverlapTail(body);
    groupStart = endExclusive;
  };

  for (let i = 0; i < units.length; i++) {
    const unit = units[i] ?? "";

    if (isStructuralHeading(unit)) {
      const hasMin = i - groupStart >= MIN_UNITS_PER_CHUNK;
      const currentChars = units.slice(groupStart, i).join(" ").length;
      if (hasMin && currentChars >= CHUNKING_MIN_CHARS) {
        flush(i);
      }
      sectionTitle = unit;
    }

    if (i === 0) continue;

    const isBreak = breaksBefore.has(i);
    const currentChars = units.slice(groupStart, i).join(" ").length;
    const wouldExceedMax = currentChars + unit.length + 1 > CHUNKING_MAX_CHARS;
    const hasMin = i - groupStart >= MIN_UNITS_PER_CHUNK;

    if ((isBreak && hasMin) || wouldExceedMax) {
      flush(i);
    }
  }

  flush(units.length);
  return chunks;
}

function mergeSmallTrailingChunks(
  chunks: Omit<TextChunk, "chunkIndex">[],
  minChars: number,
): Omit<TextChunk, "chunkIndex">[] {
  if (chunks.length < 2) return chunks;

  const last = chunks[chunks.length - 1]!;
  if (last.content.length >= minChars) return chunks;

  const prev = chunks[chunks.length - 2]!;
  prev.content = `${prev.content}\n\n${last.content}`.trim();
  return chunks.slice(0, -1);
}

async function chunkSegmentText(
  text: string,
  pageNumber: number | null,
): Promise<Omit<TextChunk, "chunkIndex">[]> {
  const units = splitIntoUnits(text);
  if (units.length === 0) return [];

  if (units.length < 3) {
    const content = units.join(" ").trim();
    return content ? [{ content, pageNumber }] : [];
  }

  const hardBreaks = findHardBreaks(units);
  const embeddings = await embedUnitsInBatches(units);
  const breaks = findSemanticBreaks(embeddings, hardBreaks);
  const chunks = groupUnitsIntoChunks(units, breaks, pageNumber);
  return mergeSmallTrailingChunks(chunks, CHUNKING_MERGE_TAIL_CHARS);
}

export async function chunkSegments(segments: TextSegment[]): Promise<TextChunk[]> {
  const allChunks: TextChunk[] = [];
  let chunkIndex = 0;

  for (const segment of segments) {
    if (!segment.text.trim()) continue;

    const segmentChunks = await chunkSegmentText(segment.text, segment.pageNumber);
    for (const chunk of segmentChunks) {
      allChunks.push({ ...chunk, chunkIndex: chunkIndex++ });
    }
  }

  return allChunks;
}

/** @deprecated Use chunkSegments — kept for scripts/tests. */
export async function chunkText(
  text: string,
  pageCount: number | null = null,
): Promise<TextChunk[]> {
  const pageNumber = pageCount !== null && pageCount > 0 ? 1 : null;
  return chunkSegments([{ text, pageNumber }]);
}
