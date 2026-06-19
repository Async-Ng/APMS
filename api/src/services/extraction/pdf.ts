import path from "node:path";
import { pathToFileURL } from "node:url";

import { createCanvas, DOMMatrix, Path2D, ImageData } from "@napi-rs/canvas";

import { loadEnv } from "../../config/env";
import type { ExtractionResult } from "../extraction.service";
import type { TextSegment } from "../extraction/types";
import { describeImages, pageVisionBlock } from "./vision-ocr";

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
  const pageTexts: string[] = [];
  // Pages that need a vision pass, paired with their pre-rendered PNG.
  const visionPages: Array<{ pageNumber: number; base64: string }> = [];

  for (let p = 1; p <= pageCount; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((it: any) => ("str" in it ? it.str : ""))
      .join(" ")
      .trim();
    pageTexts.push(pageText);

    if (!env.DOC_VISION_ENABLED) continue;
    if (visionPages.length >= env.DOC_VISION_MAX_IMAGES) continue;

    const scanned = pageText.length < env.DOC_VISION_SCANNED_TEXT_THRESHOLD;
    const needsVision = scanned || (await pageHasImages(pdfjs, page));
    if (needsVision) {
      const base64 = await renderPageToPngBase64(page);
      visionPages.push({ pageNumber: p, base64 });
    }
  }

  const descriptions = await describeImages(
    visionPages.map((vp) => ({ base64: vp.base64, mime: "image/png" })),
  );

  // Map pageNumber -> description for interleaving.
  const descByPage = new Map<number, string>();
  visionPages.forEach((vp, i) => descByPage.set(vp.pageNumber, descriptions[i] ?? ""));

  const segments: TextSegment[] = pageTexts.map((t, i) => {
    const p = i + 1;
    return {
      text: `${t}${pageVisionBlock(p, descByPage.get(p) ?? "")}`,
      pageNumber: p,
    };
  });

  const text = segments.map((s) => s.text).join("\n\n");

  return { text, pageCount, segments };
}
