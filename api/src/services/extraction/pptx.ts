import { XMLParser } from "fast-xml-parser";
import JSZip from "jszip";

import { loadEnv } from "../../config/env";
import { inferBlockType } from "../ai/reference-utils";
import type { ExtractionResult } from "../extraction.service";
import type { TextSegment } from "../extraction/types";
import { describeFigures, figureBlock, type ImageInput } from "./vision-markdown";

const SLIDE_RE = /^ppt\/slides\/slide(\d+)\.xml$/;
const MEDIA_RE = /^ppt\/media\/.*\.(png|jpe?g|gif|bmp|webp)$/i;

function slideNumber(name: string): number {
  const m = SLIDE_RE.exec(name);
  return m ? Number(m[1]) : 0;
}

function mimeFromName(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "gif":
      return "image/gif";
    case "bmp":
      return "image/bmp";
    case "webp":
      return "image/webp";
    default:
      return "image/png";
  }
}

/** Recursively collects every <a:t> text run value from parsed slide XML. */
function collectTextRuns(node: unknown, acc: string[] = []): string[] {
  if (node == null || typeof node !== "object") return acc;
  for (const [key, val] of Object.entries(node as Record<string, unknown>)) {
    if (key === "a:t") {
      if (typeof val === "string") acc.push(val);
      else if (val && typeof val === "object" && "#text" in (val as object)) {
        acc.push(String((val as Record<string, unknown>)["#text"]));
      } else if (Array.isArray(val)) {
        for (const v of val) {
          if (typeof v === "string") acc.push(v);
          else if (v && typeof v === "object" && "#text" in v) acc.push(String(v["#text"]));
        }
      }
    } else if (Array.isArray(val)) {
      val.forEach((c) => collectTextRuns(c, acc));
    } else if (typeof val === "object") {
      collectTextRuns(val, acc);
    }
  }
  return acc;
}

/**
 * Resolves which media files belong to a slide via its relationships part,
 * e.g. ppt/slides/_rels/slide3.xml.rels maps rIds to "../media/image5.png".
 * Returns normalized zip paths ("ppt/media/image5.png"); [] when rels are missing.
 */
async function mediaNamesForSlide(zip: JSZip, slideName: string, parser: XMLParser): Promise<string[]> {
  const relsName = slideName.replace(/^ppt\/slides\//, "ppt/slides/_rels/") + ".rels";
  const relsFile = zip.files[relsName];
  if (!relsFile) return [];

  try {
    const parsed = parser.parse(await relsFile.async("string")) as Record<string, unknown>;
    const container = parsed["Relationships"] as Record<string, unknown> | undefined;
    const raw = container?.["Relationship"];
    const relationships = Array.isArray(raw) ? raw : raw ? [raw] : [];

    const names: string[] = [];
    for (const rel of relationships) {
      const target = String((rel as Record<string, unknown>)["@_Target"] ?? "");
      if (!target) continue;
      const normalized = target.replace(/^(\.\.\/)+/, "ppt/");
      if (MEDIA_RE.test(normalized)) names.push(normalized);
    }
    return names;
  } catch (error) {
    console.warn(
      `[extraction] PPTX rels parse failed for ${slideName}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return [];
  }
}

/** Formats slide text runs as Markdown: a "## Slide N — title" heading plus bullets. */
function slideToMarkdown(slideIndex: number, runs: string[], figureLines: string[]): string {
  const cleaned = runs.map((r) => r.trim()).filter(Boolean);
  const title = cleaned[0] ?? "";
  const rest = cleaned.slice(1);

  const parts: string[] = [];
  parts.push(title ? `## Slide ${slideIndex} — ${title}` : `## Slide ${slideIndex}`);
  if (rest.length > 0) {
    parts.push(rest.map((r) => `- ${r}`).join("\n"));
  }
  for (const line of figureLines) {
    if (line) parts.push(line);
  }
  return parts.join("\n\n").trim();
}

export async function extractPptxWithVision(buffer: Buffer): Promise<ExtractionResult> {
  const env = loadEnv();
  const zip = await JSZip.loadAsync(buffer);

  const slideNames = Object.keys(zip.files)
    .filter((n) => SLIDE_RE.test(n))
    .sort((a, b) => slideNumber(a) - slideNumber(b));

  const parser = new XMLParser({ ignoreAttributes: false, textNodeName: "#text" });

  const slideRuns: string[][] = [];
  const slideMedia: string[][] = [];
  for (const name of slideNames) {
    const xml = await zip.files[name]!.async("string");
    slideRuns.push(collectTextRuns(parser.parse(xml)));
    slideMedia.push(env.DOC_VISION_ENABLED ? await mediaNamesForSlide(zip, name, parser) : []);
  }
  const slideCount = slideNames.length;

  // Flatten slide-mapped images (deduped, capped) and describe them in one pass.
  const imageNames: string[] = [];
  const imageIndexByName = new Map<string, number>();
  for (const names of slideMedia) {
    for (const name of names) {
      if (!imageIndexByName.has(name) && imageNames.length < env.DOC_VISION_MAX_PAGES) {
        imageIndexByName.set(name, imageNames.length);
        imageNames.push(name);
      }
    }
  }

  const images: ImageInput[] = [];
  for (const name of imageNames) {
    const file = zip.files[name];
    if (!file) continue;
    images.push({ base64: await file.async("base64"), mime: mimeFromName(name) });
  }
  const descriptions = images.length > 0 ? await describeFigures(images) : [];

  // Fallback: rels mapping found no slide-attached images but the deck has media.
  let trailingFigures: string[] = [];
  if (env.DOC_VISION_ENABLED && imageNames.length === 0) {
    const mediaNames = Object.keys(zip.files)
      .filter((n) => MEDIA_RE.test(n))
      .slice(0, env.DOC_VISION_MAX_PAGES);
    const fallbackImages: ImageInput[] = [];
    for (const name of mediaNames) {
      fallbackImages.push({ base64: await zip.files[name]!.async("base64"), mime: mimeFromName(name) });
    }
    const fallbackDescriptions =
      fallbackImages.length > 0 ? await describeFigures(fallbackImages) : [];
    trailingFigures = fallbackDescriptions.map(figureBlock).filter(Boolean);
  }

  const hasImageText =
    descriptions.some((d) => d.trim().length > 0) || trailingFigures.length > 0;

  const segments: TextSegment[] = slideRuns.map((runs, i) => {
    const figureLines = slideMedia[i]!
      .map((name) => {
        const idx = imageIndexByName.get(name);
        return idx === undefined ? "" : figureBlock(descriptions[idx] ?? "");
      })
      .filter(Boolean);
    const text = slideToMarkdown(i + 1, runs, figureLines);
    const slideHasVision = figureLines.length > 0;
    return {
      text,
      pageNumber: i + 1,
      blockType: slideHasVision ? "ocr" : inferBlockType(runs.join(" ")),
      extractionMode: slideHasVision ? "hybrid" : "text",
      extractionConfidence: slideHasVision ? "medium" : text.trim() ? "high" : "low",
    };
  });

  if (trailingFigures.length > 0) {
    segments.push({
      text: trailingFigures.join("\n\n"),
      pageNumber: slideCount > 0 ? slideCount : null,
      blockType: "ocr",
      extractionMode: "hybrid",
      extractionConfidence: "medium",
    });
  }

  const text = segments.map((s) => s.text).join("\n\n");
  return {
    text,
    pageCount: slideCount > 0 ? slideCount : null,
    segments,
    extractionMode: hasImageText ? "hybrid" : "text",
    extractionConfidence: hasImageText ? "medium" : "high",
  };
}
