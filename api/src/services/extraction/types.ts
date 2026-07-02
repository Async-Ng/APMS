export type SegmentBlockType =
  | "paragraph"
  | "heading"
  | "table"
  | "equation"
  | "code"
  | "figure_caption"
  | "ocr";

export type ExtractionMode = "text" | "ocr" | "hybrid";
export type ExtractionConfidence = "high" | "medium" | "low";

export interface TextSegment {
  text: string;
  pageNumber: number | null;
  sectionPath?: string[];
  headingText?: string | null;
  blockType?: SegmentBlockType;
  extractionMode?: ExtractionMode;
  extractionConfidence?: ExtractionConfidence;
}
