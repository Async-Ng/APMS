import { loadEnv } from "../../config/env";
import { runConcurrent } from "../../utils/concurrency";
import * as aiService from "../ai/ai.service";

/**
 * Prompt used to parse a full document page image into structured GitHub-flavored
 * Markdown, so tables, formulas, code, and headings survive extraction intact.
 */
export const VISION_PAGE_MARKDOWN_PROMPT = `You are a high-fidelity document page parser. Convert this page image into GitHub-flavored Markdown. Keep the document's original language exactly (do not translate).

Rules:
1. Transcribe ALL text VERBATIM in natural reading order (multi-column: finish the left column before the right). Never invent, summarize, translate, or omit text.
2. Headings: mark them with Markdown headings (#, ##, ###) matching the visual hierarchy. Keep section numbers, e.g. "## 2.1 Mô hình đề xuất".
3. Tables: output as Markdown tables with a header row and | separators. Keep every row and cell; for merged cells repeat the value.
4. Mathematics: write every formula in LaTeX — inline math as $...$, display equations on their own line as $$...$$.
5. Code: wrap source code in fenced blocks \`\`\` with a language tag when identifiable.
6. Figures, charts, diagrams, photos: at their position insert one short line: [Hình: <concise description of what it shows and its key values>]. Transcribe axis labels, legends and data values that are readable.
7. Skip page headers, footers, page numbers and watermarks.
8. Output raw Markdown only — no \`\`\` fence around the whole answer, no commentary. If the page is blank or purely decorative, return an empty string.`;

/**
 * Prompt used for standalone images embedded in DOCX/PPTX (figures, charts, photos).
 */
export const VISION_FIGURE_PROMPT = `Describe this image from a document. If it contains text, transcribe it verbatim in its original language (tables as Markdown tables, formulas as LaTeX $...$). If it is a chart or diagram, give a 1-3 sentence description including key labels and values. Output raw text/Markdown only; return an empty string if the image is decorative.`;

export interface ImageInput {
  base64: string;
  mime: string;
}

/**
 * Parses each page image into structured Markdown with bounded concurrency. A failure
 * on a single page is logged and yields "" so one bad page never fails the document.
 * Returns one Markdown string per input image (same order, "" when empty/failed).
 */
export async function parsePagesToMarkdown(images: ImageInput[]): Promise<string[]> {
  if (images.length === 0) return [];

  const env = loadEnv();

  return runConcurrent(images, env.DOC_VISION_CONCURRENCY, async (img, i) => {
    try {
      return await aiService.parseImageToMarkdown(
        img.base64,
        img.mime,
        VISION_PAGE_MARKDOWN_PROMPT,
      );
    } catch (error) {
      console.warn(
        `[extraction] Vision page parse failed for image ${i}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return "";
    }
  });
}

/**
 * Describes each standalone figure image via Gemini Vision with bounded concurrency.
 * Fail-soft per image, capped at DOC_VISION_MAX_PAGES total.
 */
export async function describeFigures(images: ImageInput[]): Promise<string[]> {
  if (images.length === 0) return [];

  const env = loadEnv();
  const capped = images.slice(0, env.DOC_VISION_MAX_PAGES);

  const described = await runConcurrent(
    capped,
    env.DOC_VISION_CONCURRENCY,
    async (img, i) => {
      try {
        return await aiService.describeImage(img.base64, img.mime, VISION_FIGURE_PROMPT);
      } catch (error) {
        console.warn(
          `[extraction] Vision failed for image ${i}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        return "";
      }
    },
  );

  // Images beyond the cap yield "" so callers can rely on positional mapping.
  return [...described, ...new Array(images.length - capped.length).fill("")];
}

/** Formats a figure description as an in-position Markdown line. Empty desc → "". */
export function figureBlock(description: string): string {
  const desc = description.trim();
  return desc ? `[Hình: ${desc}]` : "";
}
