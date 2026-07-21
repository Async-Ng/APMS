import type { CitationContext } from "@/lib/queries/documents";

export const CITATION_HIGHLIGHT_CLASS =
  "rounded bg-yellow-200 px-0.5 text-brutal-ink ring-2 ring-yellow-400";
export const CITATION_BLOCK_CLASS =
  "rounded-lg bg-yellow-100/80 ring-2 ring-yellow-400 ring-offset-2";

const MIN_TOKEN_LENGTH = 3;

export function normalizeCitationText(value: string): string {
  return value
    .toLocaleLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function citationNeedle(context: CitationContext | null | undefined): string {
  if (!context) return "";
  return (context.excerpt || context.content || "").trim();
}

export function tokenSet(value: string): Set<string> {
  const normalized = normalizeCitationText(value);
  return new Set(
    normalized
      .split(" ")
      .map((token) => token.trim())
      .filter((token) => token.length >= MIN_TOKEN_LENGTH),
  );
}

export function overlapScore(candidate: string, needle: string): number {
  const candidateTokens = tokenSet(candidate);
  const needleTokens = tokenSet(needle);
  if (candidateTokens.size === 0 || needleTokens.size === 0) return 0;

  let matches = 0;
  for (const token of needleTokens) {
    if (candidateTokens.has(token)) matches += 1;
  }

  return matches / needleTokens.size;
}

export function findBestElement<T extends Element>(
  elements: T[],
  needle: string,
): T | null {
  let best: { element: T; score: number } | null = null;

  for (const element of elements) {
    const text = element.textContent ?? "";
    const score = overlapScore(text, needle);
    if (!best || score > best.score) {
      best = { element, score };
    }
  }

  return best && best.score > 0 ? best.element : null;
}

export function highlightFirstTextMatch(root: HTMLElement, needle: string): boolean {
  const normalizedNeedle = normalizeCitationText(needle);
  if (!normalizedNeedle) return false;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();

  while (node) {
    const textNode = node as Text;
    const rawText = textNode.textContent ?? "";
    const normalizedText = normalizeCitationText(rawText);

    if (normalizedText.length > 0) {
      const exactIndex = rawText.toLocaleLowerCase().indexOf(needle.slice(0, 80).toLocaleLowerCase());
      const shouldHighlight =
        exactIndex >= 0 ||
        normalizedNeedle.includes(normalizedText) ||
        normalizedText.includes(normalizedNeedle.slice(0, Math.min(normalizedNeedle.length, 80)));

      if (shouldHighlight && textNode.parentElement) {
        const mark = document.createElement("mark");
        mark.className = CITATION_HIGHLIGHT_CLASS;
        mark.textContent = rawText;
        textNode.replaceWith(mark);
        return true;
      }
    }

    node = walker.nextNode();
  }

  return false;
}
