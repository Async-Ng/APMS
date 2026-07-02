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
export const CHUNKING_MIN_CHARS = 260;
export const CHUNKING_MERGE_TAIL_CHARS = 180;

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

interface MarkdownBlock {
  type: SegmentBlockType;
  text: string;
  /** Only set for heading blocks (1-6). */
  headingLevel?: number;
}

interface HeadingFrame {
  level: number;
  /** Heading text without the leading # markers. */
  title: string;
  /** Numbered section path ("2.1" -> ["2","1"]) when the title is numbered. */
  numberPath: string[] | null;
  displayHeading: string;
}

/**
 * Heading hierarchy carried across segments/pages so a section that spans several
 * pages keeps its sectionPath. Mutated by the chunker as headings stream by.
 */
interface HeadingState {
  stack: HeadingFrame[];
}

const FIGURE_LINE_RE = /^\[Hình[^\]]*\]/;
const TABLE_LINE_RE = /^\s*\|.*\|\s*$/;
const FENCE_RE = /^```/;
const MD_HEADING_RE = /^(#{1,6})\s+(.+)$/;
const LIST_ITEM_RE = /^\s*(?:[-*+]|\d+[.)])\s+/;

function headingFrameFor(level: number, title: string): HeadingFrame {
  const info = extractHeadingInfo(title);
  return {
    level,
    title,
    numberPath: info ? info.sectionPath : null,
    displayHeading: info?.displayHeading ?? title,
  };
}

function pushHeading(state: HeadingState, frame: HeadingFrame): void {
  while (
    state.stack.length > 0 &&
    state.stack[state.stack.length - 1]!.level >= frame.level
  ) {
    state.stack.pop();
  }
  state.stack.push(frame);
}

function currentSectionPath(state: HeadingState): string[] {
  const top = state.stack[state.stack.length - 1];
  if (!top) return [];
  // A numbered heading carries its own full path ("2.1.3" -> ["2","1","3"]).
  if (top.numberPath) return [...top.numberPath];
  return state.stack.map((frame) => frame.title);
}

function currentDisplayHeading(state: HeadingState): string | null {
  return state.stack[state.stack.length - 1]?.displayHeading ?? null;
}

/**
 * Splits segment text into typed Markdown blocks. Handles both vision-produced
 * Markdown and legacy plain text (headings detected heuristically).
 */
function lexMarkdownBlocks(text: string): MarkdownBlock[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  let paragraph: string[] = [];

  const flushParagraph = () => {
    const body = paragraph.join("\n").trim();
    paragraph = [];
    if (!body) return;
    blocks.push({ type: inferBlockType(body), text: body });
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      continue;
    }

    // Fenced code block (verbatim, fences included).
    if (FENCE_RE.test(trimmed)) {
      flushParagraph();
      const codeLines = [line];
      i++;
      while (i < lines.length) {
        codeLines.push(lines[i]!);
        if (FENCE_RE.test(lines[i]!.trim())) break;
        i++;
      }
      blocks.push({ type: "code", text: codeLines.join("\n") });
      continue;
    }

    // Display math block $$ ... $$.
    if (trimmed.startsWith("$$")) {
      flushParagraph();
      const mathLines = [line];
      if (!(trimmed.length > 2 && trimmed.endsWith("$$"))) {
        i++;
        while (i < lines.length) {
          mathLines.push(lines[i]!);
          if (lines[i]!.trim().endsWith("$$")) break;
          i++;
        }
      }
      blocks.push({ type: "equation", text: mathLines.join("\n") });
      continue;
    }

    // Markdown heading.
    const mdHeading = MD_HEADING_RE.exec(trimmed);
    if (mdHeading) {
      flushParagraph();
      blocks.push({
        type: "heading",
        text: mdHeading[2]!.trim(),
        headingLevel: mdHeading[1]!.length,
      });
      continue;
    }

    // Legacy plain-text heading (numbered / "Chương N" / ALL-CAPS).
    if (!LIST_ITEM_RE.test(trimmed) && isStructuralHeading(trimmed)) {
      flushParagraph();
      const info = extractHeadingInfo(trimmed);
      blocks.push({
        type: "heading",
        text: trimmed,
        headingLevel: info ? Math.min(Math.max(info.sectionPath.length, 1), 6) : 2,
      });
      continue;
    }

    // Markdown table: maximal run of |-delimited lines.
    if (TABLE_LINE_RE.test(line)) {
      flushParagraph();
      const tableLines = [line];
      while (i + 1 < lines.length && TABLE_LINE_RE.test(lines[i + 1]!)) {
        i++;
        tableLines.push(lines[i]!);
      }
      blocks.push({ type: "table", text: tableLines.join("\n") });
      continue;
    }

    // Figure description line inserted during extraction.
    if (FIGURE_LINE_RE.test(trimmed)) {
      flushParagraph();
      blocks.push({ type: "figure_caption", text: trimmed });
      continue;
    }

    paragraph.push(line);
  }

  flushParagraph();
  return blocks;
}

/** Splits an oversized Markdown table by rows, repeating the header rows per piece. */
function splitTableByRows(text: string, maxChars: number): string[] {
  const lines = text.split("\n");
  const separatorIdx = lines.findIndex((l) => /^\s*\|?[\s:|-]+\|?\s*$/.test(l) && l.includes("-"));
  const headerLines = separatorIdx >= 1 ? lines.slice(0, separatorIdx + 1) : [];
  const bodyLines = separatorIdx >= 1 ? lines.slice(separatorIdx + 1) : lines;
  const header = headerLines.join("\n");

  const pieces: string[] = [];
  let rows: string[] = [];
  let size = header.length;

  const flush = () => {
    if (rows.length === 0) return;
    pieces.push([...(header ? [header] : []), ...rows].join("\n"));
    rows = [];
    size = header.length;
  };

  for (const row of bodyLines) {
    if (size + row.length + 1 > maxChars && rows.length > 0) flush();
    rows.push(row);
    size += row.length + 1;
  }
  flush();

  return pieces.length > 0 ? pieces : [text];
}

/** Splits an oversized block at line boundaries (code/equation) into <= maxChars pieces. */
function splitByLines(text: string, maxChars: number): string[] {
  const lines = text.split("\n");
  const pieces: string[] = [];
  let current: string[] = [];
  let size = 0;

  for (const line of lines) {
    if (size + line.length + 1 > maxChars && current.length > 0) {
      pieces.push(current.join("\n"));
      current = [];
      size = 0;
    }
    current.push(line);
    size += line.length + 1;
  }
  if (current.length > 0) pieces.push(current.join("\n"));

  return pieces.length > 0 ? pieces : [text];
}

/** Splits an oversized paragraph at sentence boundaries into <= maxChars pieces. */
function splitParagraphBySentences(text: string, maxChars: number): string[] {
  const sentences = text
    .split("\n")
    .flatMap((line) => splitLineIntoSentences(line));
  const pieces: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if (current.length + sentence.length + 1 > maxChars && current) {
      pieces.push(current.trim());
      current = "";
    }
    current = current ? `${current} ${sentence}` : sentence;
  }
  if (current.trim()) pieces.push(current.trim());

  return pieces.length > 0 ? pieces : [text];
}

/** Breaks a block that alone exceeds the budget into same-typed sub-blocks. */
function splitOversizedBlock(block: MarkdownBlock, maxChars: number): MarkdownBlock[] {
  if (block.text.length <= maxChars) return [block];
  const pieces =
    block.type === "table"
      ? splitTableByRows(block.text, maxChars)
      : block.type === "code" || block.type === "equation"
        ? splitByLines(block.text, maxChars)
        : splitParagraphBySentences(block.text, maxChars);
  return pieces.map((text) => ({ type: block.type, text }));
}

const BLOCK_TYPE_PRIORITY: SegmentBlockType[] = [
  "equation",
  "table",
  "code",
  "figure_caption",
  "ocr",
];

function dominantBlockType(types: SegmentBlockType[]): SegmentBlockType {
  for (const priority of BLOCK_TYPE_PRIORITY) {
    if (types.includes(priority)) return priority;
  }
  return types.includes("heading") && types.length === 1 ? "heading" : "paragraph";
}

interface ChunkDraft {
  blocks: MarkdownBlock[];
  pageNumber: number | null;
  sectionPath: string[];
  displayHeading: string | null;
  extractionMode: ExtractionMode;
  extractionConfidence: ExtractionConfidence;
}

function draftLength(draft: ChunkDraft): number {
  return draft.blocks.reduce((sum, b) => sum + b.text.length + 2, 0);
}

function buildChunk(draft: ChunkDraft): Omit<TextChunk, "chunkIndex"> | null {
  const content = draft.blocks
    .map((block) =>
      block.type === "heading" && block.headingLevel
        ? `${"#".repeat(block.headingLevel)} ${block.text}`
        : block.text,
    )
    .join("\n\n")
    .trim();
  if (!content) return null;

  return {
    content,
    queryText: normalizeMathQueryableText(
      `${draft.displayHeading ? `${draft.displayHeading} ` : ""}${content}`,
    ),
    pageNumber: draft.pageNumber,
    sectionPath: [...draft.sectionPath],
    displayHeading: draft.displayHeading,
    blockType: dominantBlockType(draft.blocks.map((b) => b.type)),
    extractionMode: draft.extractionMode,
    extractionConfidence: draft.extractionConfidence,
  };
}

function mergeSmallTrailingChunk(
  chunks: Omit<TextChunk, "chunkIndex">[],
): Omit<TextChunk, "chunkIndex">[] {
  if (chunks.length < 2) return chunks;

  const last = chunks[chunks.length - 1]!;
  if (
    last.content.length >= CHUNKING_MERGE_TAIL_CHARS ||
    last.blockType === "equation" ||
    last.blockType === "table" ||
    last.blockType === "code"
  ) {
    return chunks;
  }

  const prev = chunks[chunks.length - 2]!;
  prev.content = `${prev.content}\n\n${last.content}`.trim();
  prev.queryText = normalizeMathQueryableText(`${prev.queryText} ${last.queryText}`);
  return chunks.slice(0, -1);
}

function chunkSegmentBlocks(
  segment: TextSegment,
  state: HeadingState,
): Omit<TextChunk, "chunkIndex">[] {
  const blocks = lexMarkdownBlocks(segment.text).flatMap((block) =>
    splitOversizedBlock(block, CHUNKING_MAX_CHARS),
  );
  if (blocks.length === 0) return [];

  const extractionMode = segment.extractionMode ?? "text";
  const extractionConfidence = segment.extractionConfidence ?? "medium";

  const contextSectionPath = () => {
    const path = currentSectionPath(state);
    return path.length > 0 ? path : [...(segment.sectionPath ?? [])];
  };
  const contextHeading = () =>
    currentDisplayHeading(state) ?? segment.headingText ?? null;

  const chunks: Omit<TextChunk, "chunkIndex">[] = [];
  let draft: ChunkDraft | null = null;

  const startDraft = (): ChunkDraft => ({
    blocks: [],
    pageNumber: segment.pageNumber,
    sectionPath: contextSectionPath(),
    displayHeading: contextHeading(),
    extractionMode,
    extractionConfidence,
  });

  const flush = () => {
    if (!draft) return;
    const chunk = buildChunk(draft);
    if (chunk) chunks.push(chunk);
    draft = null;
  };

  for (const block of blocks) {
    if (block.type === "heading") {
      // A heading starts a new chunk and updates the section context for what follows.
      flush();
      pushHeading(state, headingFrameFor(block.headingLevel ?? 2, block.text));
      draft = startDraft();
      draft.blocks.push(block);
      continue;
    }

    if (!draft) draft = startDraft();

    if (
      draft.blocks.length > 0 &&
      draftLength(draft) + block.text.length + 2 > CHUNKING_MAX_CHARS
    ) {
      flush();
      draft = startDraft();
    }
    draft.blocks.push(block);
  }
  flush();

  return mergeSmallTrailingChunk(chunks);
}

/**
 * Structure-based chunker: splits Markdown (or legacy plain text) into chunks along
 * real document boundaries — headings, paragraphs, tables, code and math blocks —
 * carrying the heading hierarchy across pages. No embedding calls are made here.
 */
export function chunkSegments(segments: TextSegment[]): TextChunk[] {
  const state: HeadingState = { stack: [] };
  const allChunks: TextChunk[] = [];
  let chunkIndex = 0;

  for (const segment of segments) {
    if (!segment.text.trim()) continue;
    for (const chunk of chunkSegmentBlocks(segment, state)) {
      allChunks.push({ ...chunk, chunkIndex: chunkIndex++ });
    }
  }

  return allChunks;
}

/** @deprecated Use chunkSegments — kept for scripts/tests. */
export function chunkText(text: string, pageCount: number | null = null): TextChunk[] {
  const pageNumber = pageCount !== null && pageCount > 0 ? 1 : null;
  return chunkSegments([{ text, pageNumber }]);
}
