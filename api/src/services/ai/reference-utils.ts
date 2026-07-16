import type { SegmentBlockType } from "../extraction/types";

const DOT = "\x00DOT\x00";
const ABBREV = [
  "TS",
  "ThS",
  "GS",
  "PGS",
  "BS",
  "KS",
  "TP",
  "Tp",
  "DH",
  "CD",
  "Nxb",
  "NXB",
  "tr",
  "vd",
  "VD",
  "Mr",
  "Mrs",
  "Ms",
  "Dr",
  "Prof",
  "etc",
  "No",
  "Fig",
  "Vol",
  "St",
];

const NUMBERED_HEADING_RE = /^(\d+(?:\.\d+)*)(?:\.)?\s+(.+)$/;
const CHAPTER_HEADING_RE = /^(chuong|chapter)\s+(\d+)(?:[.:]?\s*(.*))?$/i;
const PAGE_REF_RE = /\b(?:trang|page)\s+(\d+)\b/i;
const SECTION_REF_RE = /\b(?:muc|mục|phan|phần|section|sec\.)?\s*(\d+(?:\.\d+)+)(?:\.)?\b/i;
const LEXICAL_STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "by",
  "for",
  "from",
  "how",
  "in",
  "is",
  "of",
  "on",
  "or",
  "the",
  "to",
  "what",
  "with",
  "ai",
  "apms",
  "có",
  "co",
  "của",
  "cua",
  "dẫn",
  "dan",
  "được",
  "duoc",
  "gì",
  "gi",
  "hỏi",
  "hoi",
  "hướng",
  "huong",
  "không",
  "khong",
  "là",
  "la",
  "làm",
  "lam",
  "liệu",
  "lieu",
  "này",
  "nay",
  "những",
  "nhung",
  "theo",
  "trả",
  "tra",
  "trong",
  "tài",
  "tai",
  "và",
  "va",
  "về",
  "ve",
]);

export interface HeadingInfo {
  sectionPath: string[];
  displayHeading: string;
}

export interface QueryAnalysis {
  intent:
    | "section_lookup"
    | "page_lookup"
    | "formula_lookup"
    | "definition_lookup"
    | "comparison"
    | "summary"
    | "general";
  normalizedQuery: string;
  sectionPath: string[] | null;
  pageNumber: number | null;
  formulaTokens: string[];
  lexicalTerms: string[];
}

export function protectDots(s: string): string {
  let out = s.replace(/(\d)\.(\d)/g, `$1${DOT}$2`);
  out = out.replace(/(^|\s)(\d{1,2})\.\s/g, `$1$2${DOT} `);
  out = out.replace(/\bv\.v\.?/gi, `v${DOT}v${DOT}`);
  for (const a of ABBREV) {
    out = out.replace(new RegExp(`\\b${a}\\.`, "g"), `${a}${DOT}`);
  }
  return out;
}

export function extractHeadingInfo(line: string): HeadingInfo | null {
  const trimmed = line.trim();
  const numbered = NUMBERED_HEADING_RE.exec(trimmed);
  if (numbered) {
    const sectionPath = numbered[1]!.split(".");
    return {
      sectionPath,
      displayHeading: `${numbered[1]}. ${numbered[2]!.trim()}`,
    };
  }

  const chapter = CHAPTER_HEADING_RE.exec(trimmed);
  if (chapter) {
    const chapterNumber = chapter[2]!;
    const suffix = chapter[3]?.trim();
    return {
      sectionPath: [chapterNumber],
      displayHeading: suffix
        ? `${chapter[1]} ${chapterNumber}. ${suffix}`
        : `${chapter[1]} ${chapterNumber}`,
    };
  }

  return null;
}

export function isNumberedHeading(line: string): boolean {
  return extractHeadingInfo(line) !== null;
}

export function isAllCapsHeading(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length > 120 || trimmed.length < 3) return false;
  const letters = trimmed.replace(/[^A-Za-zÀ-ỹ]/g, "");
  return letters.length > 0 && letters === letters.toUpperCase();
}

export function isStructuralHeading(line: string): boolean {
  const trimmed = line.trim();
  return isNumberedHeading(trimmed) || isAllCapsHeading(trimmed);
}

export function splitLineIntoSentences(line: string): string[] {
  const normalised = protectDots(line.replace(/[ \t]+/g, " ").trim());
  const result: string[] = [];
  for (const part of normalised.split(/(?<=[.?!])\s+/)) {
    const s = part.replace(new RegExp(DOT, "g"), ".").trim();
    if (s.length > 0) result.push(s);
  }
  return result;
}

export function normalizeMathQueryableText(input: string): string {
  return input
    .normalize("NFKC")
    .replace(/[‐‑‒–—]/g, "-")
    .replace(/[∗×]/g, "*")
    .replace(/[＝]/g, "=")
    .replace(/([A-Za-z])\s*\[\s*([A-Za-z0-9]+)\s*\]/g, "$1_$2")
    .replace(/([A-Za-z])\s*_\s*([A-Za-z0-9]+)/g, "$1_$2")
    .replace(/([A-Za-z])\s+([0-9]+)/g, "$1_$2")
    .replace(/\b([A-Za-z])\s*([0-9]+)\b/g, "$1_$2")
    .replace(/\s*=\s*/g, " = ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function extractFormulaTokens(query: string): string[] {
  const rawMatches = query.match(/[A-Za-z]+(?:_[A-Za-z0-9]+|\d+)?(?:\s*=\s*[A-Za-z0-9_+\-*/()[\]]+)?/g) ?? [];
  return unique(
    rawMatches
      .map((value) => normalizeMathQueryableText(value))
      .filter(
        (value) =>
          value.length >= 2 &&
          (value.includes("=") || /_[0-9a-z]+/.test(value) || /\d/.test(value)),
      ),
  );
}

function extractLexicalTerms(query: string): string[] {
  const sectionMatch = SECTION_REF_RE.exec(query);
  const sectionTerm = sectionMatch ? [sectionMatch[1]!] : [];
  const formulaTerms = extractFormulaTokens(query);
  const plainTerms = query
    .toLowerCase()
    .split(/[^\p{L}\p{N}_.=]+/u)
    .map((term) => term.trim())
    .filter((term) => term.length >= 2 && !LEXICAL_STOPWORDS.has(term));

  return unique([...sectionTerm, ...formulaTerms, ...plainTerms]).slice(0, 12);
}

export function analyzeQuery(query: string): QueryAnalysis {
  const sectionMatch = SECTION_REF_RE.exec(query);
  const pageMatch = PAGE_REF_RE.exec(query);
  const normalizedQuery = normalizeMathQueryableText(query);
  const formulaTokens = extractFormulaTokens(query);
  const lexicalTerms = extractLexicalTerms(query);

  let intent: QueryAnalysis["intent"] = "general";
  if (sectionMatch) intent = "section_lookup";
  else if (pageMatch) intent = "page_lookup";
  else if (formulaTokens.some((token) => token.includes("=") || /_[0-9a-z]+/.test(token))) {
    intent = "formula_lookup";
  } else if (/\b(dinh nghia|định nghĩa|la gi|là gì|what is|khai niem|khái niệm)\b/i.test(query)) {
    intent = "definition_lookup";
  } else if (/\b(so sanh|compare|khac nhau|khác nhau)\b/i.test(query)) {
    intent = "comparison";
  } else if (/\b(tom tat|tóm tắt|summary|tong hop|tổng hợp)\b/i.test(query)) {
    intent = "summary";
  }

  return {
    intent,
    normalizedQuery,
    sectionPath: sectionMatch ? sectionMatch[1]!.split(".") : null,
    pageNumber: pageMatch ? Number.parseInt(pageMatch[1] ?? "", 10) : null,
    formulaTokens,
    lexicalTerms,
  };
}

export function inferBlockType(text: string): SegmentBlockType {
  const trimmed = text.trim();
  if (!trimmed) return "paragraph";
  if (isStructuralHeading(trimmed)) return "heading";
  if (/[=≈≤≥∑∫]/.test(trimmed) || /\b[a-zA-Z]_\w+\b/.test(normalizeMathQueryableText(trimmed))) {
    return "equation";
  }
  if (/\|/.test(trimmed) || /\t/.test(trimmed) || /(?:\s{3,}|\.\.\.)/.test(trimmed)) {
    return "table";
  }
  if (/^(hinh|hình|figure|fig\.)\s+\d+/i.test(trimmed)) {
    return "figure_caption";
  }
  return "paragraph";
}
