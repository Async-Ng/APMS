import { loadEnv } from "../../config/env";
import { runConcurrent } from "../../utils/concurrency";
import * as aiService from "../ai/ai.service";

/**
 * Prompt used for every image sent to Gemini Vision. Asks for verbatim OCR plus a
 * short description so both text-in-image and figures/charts become searchable.
 */
export const VISION_OCR_PROMPT =
  "You ar a OCR tool and image description tool. Please: (1) extract the VERBATIM OCR of the entire text " +
  "in the image (keep the original language), (2) provide a short description of the image content, charts, " +
  "and tables if any. Return the raw text, no markdown. If the image has no meaningful content, " +
  "return an empty string.";

export interface ImageInput {
  base64: string;
  mime: string;
}

/**
 * Describes each image via Gemini Vision with bounded concurrency. A failure on a
 * single image is logged and yields "" so one bad image never fails the whole document.
 * Returns a description per input image (same order, "" when empty/failed).
 */
export async function describeImages(images: ImageInput[]): Promise<string[]> {
  if (images.length === 0) return [];

  const env = loadEnv();
  const capped = images.slice(0, env.DOC_VISION_MAX_IMAGES);

  return runConcurrent(capped, env.DOC_VISION_CONCURRENCY, async (img, i) => {
    try {
      return await aiService.describeImage(
        img.base64,
        img.mime,
        VISION_OCR_PROMPT,
      );
    } catch (error) {
      console.warn(
        `[extraction] Vision failed for image ${i}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return "";
    }
  });
}

/** Formats a page-anchored vision block, e.g. "[Hình trang 3: ...]". Empty desc → "". */
export function pageVisionBlock(
  pageNumber: number,
  description: string,
): string {
  const desc = description.trim();
  return desc ? `\n\n[Hình trang ${pageNumber}: ${desc}]\n\n` : "";
}

/** Formats a slide-anchored vision block, e.g. "[Hình slide 2: ...]". Empty desc → "". */
export function slideVisionBlock(
  slideNumber: number,
  description: string,
): string {
  const desc = description.trim();
  return desc ? `\n\n[Hình slide ${slideNumber}: ${desc}]\n\n` : "";
}

/** Joins standalone image descriptions (DOCX/PPTX without page anchoring) into one block. */
export function imageDescriptionsBlock(descriptions: string[]): string {
  const blocks = descriptions
    .map((d, i) => (d.trim() ? `[Hình ${i + 1}: ${d.trim()}]` : ""))
    .filter(Boolean)
    .join("\n\n");
  return blocks ? `\n\n${blocks}\n\n` : "";
}
