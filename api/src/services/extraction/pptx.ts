import { XMLParser } from "fast-xml-parser";
import JSZip from "jszip";

import { loadEnv } from "../../config/env";
import type { ExtractionResult } from "../extraction.service";
import { describeImages, imageDescriptionsBlock, type ImageInput } from "./vision-ocr";

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

export async function extractPptxWithVision(buffer: Buffer): Promise<ExtractionResult> {
  const env = loadEnv();
  const zip = await JSZip.loadAsync(buffer);

  const slideNames = Object.keys(zip.files)
    .filter((n) => SLIDE_RE.test(n))
    .sort((a, b) => slideNumber(a) - slideNumber(b));

  const parser = new XMLParser({ ignoreAttributes: false, textNodeName: "#text" });

  const slideTexts: string[] = [];
  for (const name of slideNames) {
    const xml = await zip.files[name]!.async("string");
    slideTexts.push(collectTextRuns(parser.parse(xml)).join(" ").trim());
  }
  const slideCount = slideNames.length;

  let imageBlock = "";
  if (env.DOC_VISION_ENABLED) {
    const mediaNames = Object.keys(zip.files)
      .filter((n) => MEDIA_RE.test(n))
      .slice(0, env.DOC_VISION_MAX_IMAGES);

    const images: ImageInput[] = [];
    for (const name of mediaNames) {
      const base64 = await zip.files[name]!.async("base64");
      images.push({ base64, mime: mimeFromName(name) });
    }

    const descriptions = await describeImages(images);
    imageBlock = imageDescriptionsBlock(descriptions);
  }

  const text = `${slideTexts.join("\n\n")}${imageBlock}`;
  return { text, pageCount: slideCount > 0 ? slideCount : null };
}
