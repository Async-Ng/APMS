import { cn } from "@/lib/cn";
import type { PublicDocument, PublicMatchType } from "@/lib/queries/public-documents";

const MATCH_LABELS: Record<PublicMatchType, string> = {
  exact_course: "Đúng CTĐT",
  same_subject_other_semester: "Liên quan CTĐT",
  global_public: "Công khai toàn hệ thống",
};

interface MatchTypeBadgeProps {
  matchType: PublicMatchType | null | undefined;
  className?: string;
}

export function MatchTypeBadge({ matchType, className }: MatchTypeBadgeProps) {
  if (!matchType) return null;
  const isExact = matchType === "exact_course";
  return (
    <span
      className={cn(
        "inline-flex rounded-md border-2 border-brutal-ink px-2 py-0.5 text-xs font-bold",
        isExact ? "bg-brutal-primary text-brutal-on-brand" : "bg-brutal-bg text-brutal-ink",
        className,
      )}
    >
      {MATCH_LABELS[matchType]}
    </span>
  );
}

export function getMatchTypeLabel(matchType: PublicMatchType): string {
  return MATCH_LABELS[matchType];
}

export function isSuggestedDocument(doc: PublicDocument): boolean {
  return doc.matchType != null;
}
