import { extractDocxWithVision } from "./extraction/docx";
import { extractPdfWithVision } from "./extraction/pdf";
import { extractPptxWithVision } from "./extraction/pptx";
import type {
  ExtractionConfidence,
  ExtractionMode,
  TextSegment,
} from "./extraction/types";

export type { TextSegment } from "./extraction/types";

export interface ExtractionResult {
  text: string;
  pageCount: number | null;
  segments: TextSegment[];
  extractionMode: ExtractionMode;
  extractionConfidence: ExtractionConfidence;
}

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const PPTX_MIME =
  "application/vnd.openxmlformats-officedocument.presentationml.presentation";

export async function extractText(
  buffer: Buffer,
  mimeType: string,
): Promise<ExtractionResult> {
  if (mimeType === "application/pdf") {
    return extractPdfWithVision(buffer);
  }

  if (mimeType === DOCX_MIME) {
    return extractDocxWithVision(buffer);
  }

  if (mimeType === PPTX_MIME) {
    return extractPptxWithVision(buffer);
  }

  console.warn(`[extraction] Unknown mimeType ${mimeType} — skipping`);
  return {
    text: "",
    pageCount: null,
    segments: [],
    extractionMode: "text",
    extractionConfidence: "low",
  };
}
