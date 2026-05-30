const CHUNK_SIZE = 1500; // characters
const OVERLAP = 150; // characters

export interface TextChunk {
  content: string;
  chunkIndex: number;
  pageNumber: number | null;
}

export function chunkText(
  text: string,
  pageCount: number | null = null,
): TextChunk[] {
  const clean = text.replace(/\s+/g, " ").trim();

  if (clean.length === 0) {
    return [];
  }

  const chunks: TextChunk[] = [];
  let start = 0;
  let index = 0;

  while (start < clean.length) {
    const end = Math.min(start + CHUNK_SIZE, clean.length);

    let breakPoint = end;
    if (end < clean.length) {
      // Prefer breaking at sentence boundary, fall back to word boundary
      const sentenceBreak = clean.lastIndexOf(". ", end);
      const wordBreak = clean.lastIndexOf(" ", end);

      if (sentenceBreak > start + CHUNK_SIZE * 0.5) {
        breakPoint = sentenceBreak + 1;
      } else if (wordBreak > start) {
        breakPoint = wordBreak;
      }
    }

    const content = clean.slice(start, breakPoint).trim();

    if (content.length > 0) {
      const pageNumber =
        pageCount !== null
          ? Math.ceil(((start + breakPoint) / 2 / clean.length) * pageCount)
          : null;

      chunks.push({ content, chunkIndex: index++, pageNumber });
    }

    if (breakPoint >= clean.length) break;

    start = Math.max(breakPoint - OVERLAP, start + 1);
  }

  return chunks;
}
