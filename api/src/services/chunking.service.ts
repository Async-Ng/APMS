import { runConcurrent } from "../utils/concurrency";
import { loadEnv } from "../config/env";
import * as aiService from "./ai/ai.service";
import {
  extractHeadingInfo,
  inferBlockType,
  isStructuralHeading,
  normalizeMathQueryableText,
  splitLineIntoSentences,
} from "./ai/reference-utils";
import type {
  ExtractionConfidence,
  ExtractionMode,
  SegmentBlockType,
  TextSegment,
} from "./extraction/types";

export const CHUNKING_MAX_CHARS = 1500;
export const CHUNKING_OVERLAP_CHARS = 150;
export const CHUNKING_MIN_CHARS = 260;
export const CHUNKING_MERGE_TAIL_CHARS = 180;

const SEMANTIC_BREAK_PERCENTILE = 20;
const MAX_BREAK_SIMILARITY = 0.9;
const SIMILARITY_DROP_DELTA = 0.05;
const MIN_UNITS_PER_CHUNK = 2;
const SENTENCE_EMBED_BATCH = 50;
const WINDOW_RADIUS = 2;

interface TextUnit {
  text: string;
  pageNumber: number | null;
  sectionPath: string[];
  displayHeading: string | null;
  blockType: SegmentBlockType;
  extractionMode: ExtractionMode;
  extractionConfidence: ExtractionConfidence;
  isHeading: boolean;
}

export interface TextChunk {
  content: string;
  queryText: string;
  chunkIndex: number;
  pageNumber: number | null;
  sectionPath: string[];
  displayHeading: string | null;
  blockType: SegmentBlockType;
  extractionMode: ExtractionMode;
  extractionConfidence: ExtractionConfidence;
}

function detectHeading(line: string): { sectionPath: string[]; displayHeading: string } | null {
  return extractHeadingInfo(line);
}

function buildHeadingFromAllCaps(line: string, priorSectionPath: string[]): {
  sectionPath: string[];
  displayHeading: string;
} | null {
  if (!isStructuralHeading(line) || detectHeading(line)) return null;
  const nextSectionPath =
    priorSectionPath.length > 0 ? [...priorSectionPath, String(priorSectionPath.length + 1)] : [];
  return {
    sectionPath: nextSectionPath,
    displayHeading: line.trim(),
  };
}

function splitIntoUnits(segment: TextSegment): TextUnit[] {
  const normalised = segment.text.replace(/\r\n/g, "\n").trim();
  if (!normalised) return [];

  const lines = normalised
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const units: TextUnit[] = [];
  let currentSectionPath = [...(segment.sectionPath ?? [])];
  let currentHeading = segment.headingText ?? null;

  for (const line of lines) {
    const numberedHeading = detectHeading(line);
    const allCapsHeading = numberedHeading ? null : buildHeadingFromAllCaps(line, currentSectionPath);
    const heading = numberedHeading ?? allCapsHeading;

    if (heading) {
      currentSectionPath = heading.sectionPath;
      currentHeading = heading.displayHeading;
      units.push({
        text: heading.displayHeading,
        pageNumber: segment.pageNumber,
        sectionPath: [...currentSectionPath],
        displayHeading: currentHeading,
        blockType: "heading",
        extractionMode: segment.extractionMode ?? "text",
        extractionConfidence: segment.extractionConfidence ?? "medium",
        isHeading: true,
      });
      continue;
    }

    const blockType = segment.blockType && segment.blockType !== "paragraph"
      ? segment.blockType
      : inferBlockType(line);

    const sentenceLike =
      blockType === "paragraph" || blockType === "figure_caption"
        ? splitLineIntoSentences(line)
        : [line];

    for (const text of sentenceLike) {
      units.push({
        text,
        pageNumber: segment.pageNumber,
        sectionPath: [...currentSectionPath],
        displayHeading: currentHeading,
        blockType,
        extractionMode: segment.extractionMode ?? "text",
        extractionConfidence: segment.extractionConfidence ?? "medium",
        isHeading: false,
      });
    }
  }

  return units;
}

function findHardBreaks(units: TextUnit[]): Set<number> {
  const breaks = new Set<number>([0]);
  for (let i = 1; i < units.length; i++) {
    const current = units[i]!;
    const previous = units[i - 1]!;
    if (
      current.isHeading ||
      current.pageNumber !== previous.pageNumber ||
      current.sectionPath.join(".") !== previous.sectionPath.join(".")
    ) {
      breaks.add(i);
    }
  }
  return breaks;
}

async function embedUnitsInBatches(units: TextUnit[]): Promise<number[][]> {
  const env = loadEnv();
  const batches: string[][] = [];
  for (let i = 0; i < units.length; i += SENTENCE_EMBED_BATCH) {
    batches.push(units.slice(i, i + SENTENCE_EMBED_BATCH).map((unit) => unit.text));
  }
  const results = await runConcurrent(batches, env.SENTENCE_EMBED_CONCURRENCY, (batch) =>
    aiService.embedBatch(batch, "similarity"),
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
    const current = i < adjSims.length ? unitsPreferSemanticSplit(i, hardBreaks, adjSims, windowSims, threshold) : false;
    if (current) breaks.add(i);
  }

  return breaks;
}

function unitsPreferSemanticSplit(
  index: number,
  hardBreaks: Set<number>,
  adjSims: number[],
  windowSims: number[],
  threshold: number,
): boolean {
  if (hardBreaks.has(index)) return true;
  const belowThreshold = (adjSims[index - 1] ?? 1) < threshold;
  const sharpDrop =
    index >= 2 &&
    (windowSims[index - 2] ?? 0) - (windowSims[index - 1] ?? 0) >= SIMILARITY_DROP_DELTA;
  return belowThreshold || sharpDrop;
}

function dominantBlockType(units: TextUnit[]): SegmentBlockType {
  if (units.some((unit) => unit.blockType === "equation")) return "equation";
  if (units.some((unit) => unit.blockType === "table")) return "table";
  if (units.some((unit) => unit.blockType === "ocr")) return "ocr";
  if (units.some((unit) => unit.blockType === "figure_caption")) return "figure_caption";
  return units.some((unit) => unit.blockType === "heading") ? "heading" : "paragraph";
}

function takeOverlapTail(text: string): string {
  if (text.length <= CHUNKING_OVERLAP_CHARS) return text;
  const tail = text.slice(-CHUNKING_OVERLAP_CHARS);
  const spaceIdx = tail.indexOf(" ");
  return spaceIdx > 0 ? tail.slice(spaceIdx + 1) : tail;
}

function buildChunkFromUnits(
  units: TextUnit[],
  overlapPrefix: string,
): Omit<TextChunk, "chunkIndex"> | null {
  const body = units.map((unit) => unit.text).join(" ").replace(/\s+/g, " ").trim();
  if (!body) return null;

  const content = overlapPrefix ? `${overlapPrefix} ${body}`.trim() : body;
  const first = units[0]!;
  const blockType = dominantBlockType(units);
  const extractionMode =
    units.some((unit) => unit.extractionMode === "hybrid")
      ? "hybrid"
      : units.some((unit) => unit.extractionMode === "ocr")
        ? "ocr"
        : "text";
  const extractionConfidence =
    units.some((unit) => unit.extractionConfidence === "low")
      ? "low"
      : units.some((unit) => unit.extractionConfidence === "medium")
        ? "medium"
        : "high";

  return {
    content,
    queryText: normalizeMathQueryableText(
      `${first.displayHeading ? `${first.displayHeading} ` : ""}${content}`,
    ),
    pageNumber: first.pageNumber,
    sectionPath: [...first.sectionPath],
    displayHeading: first.displayHeading,
    blockType,
    extractionMode,
    extractionConfidence,
  };
}

function groupUnitsIntoChunks(
  units: TextUnit[],
  breaksBefore: Set<number>,
): Omit<TextChunk, "chunkIndex">[] {
  const chunks: Omit<TextChunk, "chunkIndex">[] = [];
  let groupStart = 0;
  let overlapPrefix = "";

  const flush = (endExclusive: number) => {
    const chunk = buildChunkFromUnits(units.slice(groupStart, endExclusive), overlapPrefix);
    if (!chunk) return;
    chunks.push(chunk);
    overlapPrefix = takeOverlapTail(chunk.content);
    groupStart = endExclusive;
  };

  for (let i = 1; i <= units.length; i++) {
    if (i === units.length) {
      flush(i);
      break;
    }

    const slice = units.slice(groupStart, i);
    const currentText = slice.map((unit) => unit.text).join(" ");
    const currentChars = currentText.length;
    const nextUnit = units[i]!;
    const isBreak = breaksBefore.has(i);
    const wouldExceedMax = currentChars + nextUnit.text.length + 1 > CHUNKING_MAX_CHARS;
    const minChars = dominantBlockType(slice) === "equation" || dominantBlockType(slice) === "table"
      ? Math.floor(CHUNKING_MIN_CHARS / 2)
      : CHUNKING_MIN_CHARS;
    const hasMin = currentChars >= minChars || i - groupStart >= MIN_UNITS_PER_CHUNK;

    if ((isBreak && hasMin) || wouldExceedMax) {
      flush(i);
    }
  }

  return chunks;
}

function mergeSmallTrailingChunks(
  chunks: Omit<TextChunk, "chunkIndex">[],
  minChars: number,
): Omit<TextChunk, "chunkIndex">[] {
  if (chunks.length < 2) return chunks;

  const last = chunks[chunks.length - 1]!;
  if (last.content.length >= minChars || last.blockType === "equation" || last.blockType === "table") {
    return chunks;
  }

  const prev = chunks[chunks.length - 2]!;
  prev.content = `${prev.content}\n\n${last.content}`.trim();
  prev.queryText = normalizeMathQueryableText(`${prev.queryText} ${last.queryText}`);
  return chunks.slice(0, -1);
}

async function chunkSegmentText(segment: TextSegment): Promise<Omit<TextChunk, "chunkIndex">[]> {
  const units = splitIntoUnits(segment);
  if (units.length === 0) return [];

  if (units.length < 3) {
    const chunk = buildChunkFromUnits(units, "");
    return chunk ? [chunk] : [];
  }

  const hardBreaks = findHardBreaks(units);
  const embeddings = await embedUnitsInBatches(units);
  const breaks = findSemanticBreaks(embeddings, hardBreaks);
  const chunks = groupUnitsIntoChunks(units, breaks);
  return mergeSmallTrailingChunks(chunks, CHUNKING_MERGE_TAIL_CHARS);
}

export async function chunkSegments(segments: TextSegment[]): Promise<TextChunk[]> {
  const env = loadEnv();
  const nonEmptySegments = segments.filter((segment) => segment.text.trim());

  const perSegmentChunks = await runConcurrent(
    nonEmptySegments,
    env.SENTENCE_EMBED_CONCURRENCY,
    (segment) => chunkSegmentText(segment),
  );

  const allChunks: TextChunk[] = [];
  let chunkIndex = 0;
  for (const segmentChunks of perSegmentChunks) {
    for (const chunk of segmentChunks) {
      allChunks.push({ ...chunk, chunkIndex: chunkIndex++ });
    }
  }

  return allChunks;
}

/** @deprecated Use chunkSegments â€” kept for scripts/tests. */
export async function chunkText(
  text: string,
  pageCount: number | null = null,
): Promise<TextChunk[]> {
  const pageNumber = pageCount !== null && pageCount > 0 ? 1 : null;
  return chunkSegments([{ text, pageNumber }]);
}
