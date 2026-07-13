import path from "node:path";
import { pathToFileURL } from "node:url";

import { createCanvas, DOMMatrix, Path2D, ImageData } from "@napi-rs/canvas";

import { loadEnv } from "../../config/env";
import {
  extractHeadingInfo,
  inferBlockType,
  isStructuralHeading,
} from "../ai/reference-utils";
import type { ExtractionResult } from "../extraction.service";
import type { TextSegment } from "../extraction/types";
import { parsePagesToMarkdown } from "./vision-markdown";

// pdfjs-dist is ESM-only; this project is CommonJS + ts-node, which rewrites a plain
// `await import()` into `require()` and breaks ESM loading. This Function escape hatch
// forces a real dynamic import that TypeScript/ts-node leaves untouched.
const dynamicImport = new Function("p", "return import(p)") as (p: string) => Promise<any>;

// pdfjs looks for these on globalThis when rendering vector graphics / images in Node.
const g = globalThis as Record<string, unknown>;
g.DOMMatrix ??= DOMMatrix;
g.Path2D ??= Path2D;
g.ImageData ??= ImageData;

// pdfjs's built-in NodeCanvasFactory requires the native `canvas` package, which this
// project doesn't install (it uses @napi-rs/canvas instead). Without this override,
// any inline image XObject makes pdfjs create its own canvas internally and crash with
// "Cannot read properties of undefined (reading 'createCanvas')".
class NapiCanvasFactory {
  create(width: number, height: number) {
    if (width <= 0 || height <= 0) {
      throw new Error("Invalid canvas size");
    }
    const canvas = createCanvas(width, height);
    return { canvas, context: canvas.getContext("2d") };
  }
  reset(canvasAndContext: { canvas: any }, width: number, height: number) {
    if (!canvasAndContext.canvas) {
      throw new Error("Canvas is not specified");
    }
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  }
  destroy(canvasAndContext: { canvas: any; context: any }) {
    if (!canvasAndContext.canvas) {
      throw new Error("Canvas is not specified");
    }
    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
    canvasAndContext.canvas = null;
    canvasAndContext.context = null;
  }
}

const RENDER_SCALE = 2.0; // 2x upscale for legible OCR; lower to reduce cost.

let pdfjsPromise: Promise<any> | null = null;

async function getPdfjs(): Promise<any> {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const pdfjs = await dynamicImport("pdfjs-dist/legacy/build/pdf.mjs");
      pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(
        require.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs"),
      ).href;
      return pdfjs;
    })();
  }
  return pdfjsPromise;
}

function standardFontDataUrl(): string {
  const pkgDir = path.dirname(require.resolve("pdfjs-dist/package.json"));
  // Trailing separator required by pdfjs; pathToFileURL keeps the trailing slash.
  return pathToFileURL(path.join(pkgDir, "standard_fonts") + path.sep).href;
}

async function pageHasImages(pdfjs: any, page: any): Promise<boolean> {
  const ops = await page.getOperatorList();
  const { OPS } = pdfjs;
  return ops.fnArray.some(
    (fn: number) =>
      fn === OPS.paintImageXObject ||
      fn === OPS.paintInlineImage ||
      fn === OPS.paintImageXObjectRepeat,
  );
}

async function renderPageToPngBase64(page: any): Promise<string> {
  const viewport = page.getViewport({ scale: RENDER_SCALE });
  const canvas = createCanvas(viewport.width, viewport.height);
  const ctx = canvas.getContext("2d");
  await page.render({ canvasContext: ctx as unknown, viewport }).promise;
  return canvas.toBuffer("image/png").toString("base64");
}

function extractPageTextLines(items: any[]): string[] {
  const textItems = items
    .filter((it) => typeof it?.str === "string" && it.str.trim().length > 0)
    .map((it) => ({
      text: String(it.str),
      x: Array.isArray(it.transform) ? Number(it.transform[4] ?? 0) : 0,
      y: Array.isArray(it.transform) ? Number(it.transform[5] ?? 0) : 0,
    }))
    .sort((a, b) => Math.abs(a.y - b.y) <= 2 ? a.x - b.x : b.y - a.y);

  const lines: Array<{ y: number; parts: typeof textItems }> = [];
  for (const item of textItems) {
    const existing = lines.find((line) => Math.abs(line.y - item.y) <= 2);
    if (existing) {
      existing.parts.push(item);
    } else {
      lines.push({ y: item.y, parts: [item] });
    }
  }

  return lines
    .map((line) =>
      line.parts
        .sort((a, b) => a.x - b.x)
        .map((part) => part.text.trim())
        .join(" ")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(Boolean);
}

const MATH_SIGNAL_RE = /[∑∫√≠≈≤≥±×÷^]|\\frac|\b[a-zA-Z]\s*=\s*[a-zA-Z0-9(]/;
const TABLE_LINE_RE = /(?:\S\s{3,}\S.*\s{3,}\S)|\t.*\t|\|.*\|/;

/**
 * Heuristic for the "auto" vision strategy: pages whose extracted text looks like it
 * contains formulas or column/table layout get a vision pass even when not scanned.
 */
function pageLooksStructured(lines: string[]): boolean {
  let mathLines = 0;
  let tableLines = 0;
  for (const line of lines) {
    if (MATH_SIGNAL_RE.test(line)) mathLines += 1;
    if (TABLE_LINE_RE.test(line)) tableLines += 1;
    if (mathLines >= 2 || tableLines >= 3) return true;
  }
  return false;
}

/**
 * Converts pdfjs-reconstructed lines into lightweight Markdown: detected headings get
 * a "#" prefix at their section depth, everything else stays as paragraph text.
 * Used for pages that skip the vision pass.
 */
function pdfLinesToMarkdown(lines: string[]): string {
  const out: string[] = [];
  for (const line of lines) {
    const headingInfo = extractHeadingInfo(line);
    if (headingInfo) {
      const level = Math.min(Math.max(headingInfo.sectionPath.length, 1), 6);
      out.push("", `${"#".repeat(level)} ${line.trim()}`, "");
    } else if (isStructuralHeading(line)) {
      out.push("", `## ${line.trim()}`, "");
    } else {
      out.push(line);
    }
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** Strips Markdown heading markers so extractHeadingInfo can parse "## 2.1 Title". */
function firstHeadingLine(markdown: string): string {
  const firstLine = markdown.split("\n").find((l) => l.trim().length > 0) ?? "";
  return firstLine.replace(/^#{1,6}\s+/, "").trim();
}

export async function extractPdfWithVision(buffer: Buffer): Promise<ExtractionResult> {
  const env = loadEnv();
  const pdfjs = await getPdfjs();

  const doc = await pdfjs.getDocument({
    data: new Uint8Array(buffer),
    disableFontFace: true,
    useSystemFonts: false,
    standardFontDataUrl: standardFontDataUrl(),
    CanvasFactory: NapiCanvasFactory,
  }).promise;

  const pageCount: number = doc.numPages;
  const pageLines: string[][] = [];
  const scannedPages = new Set<number>();
  // Pages that get a vision markdown parse, paired with their pre-rendered PNG.
  const visionPages: Array<{ pageNumber: number; base64: string }> = [];
  // Pages that would have needed vision (scanned/structured/all-strategy) but were
  // skipped because DOC_VISION_MAX_PAGES was already reached — these fall back to
  // the lossy pdfjs-text conversion and lose table/formula structure, so they're
  // tracked separately to surface as low-confidence rather than silently "high".
  const cappedPages = new Set<number>();

  for (let p = 1; p <= pageCount; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const lines = extractPageTextLines(content.items);
    const pageText = lines.join("\n").trim();
    pageLines.push(lines);

    const scanned = pageText.length < env.DOC_VISION_SCANNED_TEXT_THRESHOLD;
    if (scanned) scannedPages.add(p);

    if (!env.DOC_VISION_ENABLED) continue;

    if (visionPages.length >= env.DOC_VISION_MAX_PAGES) {
      const likelyNeedsVision =
        env.DOC_VISION_PAGE_STRATEGY === "all" || scanned || pageLooksStructured(lines);
      if (likelyNeedsVision) cappedPages.add(p);
      continue;
    }

    const needsVision =
      env.DOC_VISION_PAGE_STRATEGY === "all" ||
      scanned ||
      pageLooksStructured(lines) ||
      (await pageHasImages(pdfjs, page));
    if (needsVision) {
      const base64 = await renderPageToPngBase64(page);
      visionPages.push({ pageNumber: p, base64 });
    }
  }

  if (visionPages.length > 0) {
    console.info(
      `[extraction] PDF vision parse: ${visionPages.length}/${pageCount} pages (strategy=${env.DOC_VISION_PAGE_STRATEGY})`,
    );
  }
  if (cappedPages.size > 0) {
    console.warn(
      `[extraction] PDF vision cap reached (DOC_VISION_MAX_PAGES=${env.DOC_VISION_MAX_PAGES}): ` +
        `${cappedPages.size} page(s) needing vision fell back to lossy text extraction: ` +
        `${[...cappedPages].join(", ")}`,
    );
  }

  const markdowns = await parsePagesToMarkdown(
    visionPages.map((vp) => ({ base64: vp.base64, mime: "image/png" })),
  );

  // Map pageNumber -> vision markdown for substitution.
  const markdownByPage = new Map<number, string>();
  visionPages.forEach((vp, i) => {
    const md = (markdowns[i] ?? "").trim();
    if (md) markdownByPage.set(vp.pageNumber, md);
  });

  const segments: TextSegment[] = pageLines.map((lines, i) => {
    const p = i + 1;
    const visionMarkdown = markdownByPage.get(p);
    const scanned = scannedPages.has(p);
    // Vision markdown replaces the pdfjs text entirely; otherwise fall back to a
    // lightweight local markdown conversion of the positioned-text lines.
    const text = visionMarkdown ?? pdfLinesToMarkdown(lines);
    const headingInfo = extractHeadingInfo(firstHeadingLine(text));
    return {
      text,
      pageNumber: p,
      sectionPath: headingInfo?.sectionPath ?? [],
      headingText: headingInfo?.displayHeading ?? null,
      blockType: visionMarkdown && scanned ? "ocr" : inferBlockType(text),
      extractionMode: visionMarkdown ? (scanned ? "ocr" : "hybrid") : "text",
      extractionConfidence: visionMarkdown
        ? "medium"
        : cappedPages.has(p) || scanned
          ? "low"
          : "high",
    };
  });

  const scannedPageCount = scannedPages.size;
  const text = segments.map((s) => s.text).join("\n\n");
  const extractionMode =
    scannedPageCount === 0 ? "text" : scannedPageCount === pageCount ? "ocr" : "hybrid";
  const extractionConfidence =
    scannedPageCount === 0 ? "high" : scannedPageCount < pageCount ? "medium" : "low";

  return { text, pageCount, segments, extractionMode, extractionConfidence };
}
