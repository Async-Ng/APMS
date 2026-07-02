import { gfm } from "@joplin/turndown-plugin-gfm";
import mammoth from "mammoth";
import TurndownService from "turndown";

import { loadEnv } from "../../config/env";
import { inferBlockType } from "../ai/reference-utils";
import type { ExtractionResult } from "../extraction.service";
import type { TextSegment } from "../extraction/types";
import { describeFigures, figureBlock, type ImageInput } from "./vision-markdown";

const IMAGE_PLACEHOLDER_PREFIX = "__APMS_IMG_";

function createTurndown(): TurndownService {
  const service = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
  });
  gfm(service);
  return service;
}

/**
 * Replaces image placeholders emitted during HTML conversion with their vision
 * descriptions, keeping figures in their original position in the document.
 */
function substituteImagePlaceholders(markdown: string, descriptions: string[]): string {
  return markdown
    .replace(/!?\[[^\]]*\]\(__APMS_IMG_(\d+)__\)/g, (_match, index: string) => {
      const description = descriptions[Number.parseInt(index, 10)] ?? "";
      return figureBlock(description);
    })
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Splits a markdown document into segments at H1/H2 boundaries. */
function splitMarkdownIntoSegments(markdown: string): string[] {
  const lines = markdown.split("\n");
  const sections: string[] = [];
  let current: string[] = [];

  for (const line of lines) {
    if (/^#{1,2}\s/.test(line) && current.join("\n").trim().length > 0) {
      sections.push(current.join("\n").trim());
      current = [];
    }
    current.push(line);
  }
  const tail = current.join("\n").trim();
  if (tail) sections.push(tail);

  return sections.length > 0 ? sections : [markdown.trim()];
}

export async function extractDocxWithVision(buffer: Buffer): Promise<ExtractionResult> {
  const env = loadEnv();

  // Single convertToHtml pass: the image hook captures each embedded image and emits
  // a positional placeholder so figure descriptions land where the image actually is.
  const images: ImageInput[] = [];
  const htmlResult = await mammoth.convertToHtml(
    { buffer },
    {
      convertImage: mammoth.images.imgElement(async (image) => {
        const index = images.length;
        if (env.DOC_VISION_ENABLED && index < env.DOC_VISION_MAX_PAGES) {
          const base64 = await image.read("base64");
          images.push({ base64, mime: image.contentType ?? "image/png" });
          return { src: `${IMAGE_PLACEHOLDER_PREFIX}${index}__` };
        }
        return { src: "" };
      }),
    },
  );

  const rawMarkdown = createTurndown().turndown(htmlResult.value);
  const descriptions = env.DOC_VISION_ENABLED ? await describeFigures(images) : [];
  const markdown = substituteImagePlaceholders(rawMarkdown, descriptions);

  const hasImageText = descriptions.some((value) => value.trim().length > 0);
  const extractionMode = hasImageText ? "hybrid" : "text";
  const extractionConfidence = hasImageText
    ? "medium"
    : markdown.trim()
      ? "high"
      : "low";

  const segments: TextSegment[] = splitMarkdownIntoSegments(markdown).map((section) => ({
    text: section,
    pageNumber: null,
    blockType: inferBlockType(section),
    extractionMode,
    extractionConfidence,
  }));

  return {
    text: markdown,
    pageCount: null,
    segments,
    extractionMode,
    extractionConfidence,
  };
}
