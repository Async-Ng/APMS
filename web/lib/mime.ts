/** MIME helpers aligned with api/src/constants/upload.ts */

export function isPdfMime(mimeType: string | undefined): boolean {
  return !!mimeType?.includes("pdf");
}

export function isDocxMime(mimeType: string | undefined): boolean {
  if (!mimeType) return false;
  return (
    mimeType.includes("wordprocessingml") ||
    mimeType.includes("msword") ||
    mimeType.includes("word")
  );
}

export function isPptxMime(mimeType: string | undefined): boolean {
  if (!mimeType) return false;
  return (
    mimeType.includes("presentationml") ||
    mimeType.includes("powerpoint") ||
    mimeType.includes("presentation")
  );
}

export function canPreviewInBrowser(mimeType: string | undefined): boolean {
  return isPdfMime(mimeType) || isDocxMime(mimeType) || isPptxMime(mimeType);
}

export function mimeLabel(mimeType: string): string {
  if (isPdfMime(mimeType)) return "PDF Document";
  if (isPptxMime(mimeType)) return "PowerPoint Presentation";
  if (isDocxMime(mimeType)) return "Word Document";
  return "Document";
}
