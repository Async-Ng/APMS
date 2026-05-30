import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

export interface ExtractionResult {
  text: string;
  pageCount: number | null;
}

export async function extractText(
  buffer: Buffer,
  mimeType: string,
): Promise<ExtractionResult> {
  if (mimeType === "application/pdf") {
    return extractPdf(buffer);
  }

  if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return extractDocx(buffer);
  }

  // PPTX: no parser installed; return empty so document reaches "ready" without chunks
  if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  ) {
    console.warn("[extraction] PPTX extraction not yet supported — skipping text extraction");
    return { text: "", pageCount: null };
  }

  console.warn(`[extraction] Unknown mimeType ${mimeType} — skipping`);
  return { text: "", pageCount: null };
}

async function extractPdf(buffer: Buffer): Promise<ExtractionResult> {
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  return {
    text: result.text,
    pageCount: result.total ?? null,
  };
}

async function extractDocx(buffer: Buffer): Promise<ExtractionResult> {
  const result = await mammoth.extractRawText({ buffer });
  return {
    text: result.value,
    pageCount: null,
  };
}
