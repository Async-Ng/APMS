import { cn } from "@/lib/cn";
import type { ForumMatchType, InternalDocument } from "@/lib/queries/internal-documents";

const MATCH_LABELS: Record<ForumMatchType, string> = {
  exact_course: "Đúng môn học kỳ",
  same_subject_other_semester: "Cùng môn, khác học kỳ",
  global_public: "Công khai toàn hệ thống",
};

interface MatchTypeBadgeProps {
  matchType: ForumMatchType | null | undefined;
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

export function getMatchTypeLabel(matchType: ForumMatchType): string {
  return MATCH_LABELS[matchType];
}

export function isForumDocument(doc: InternalDocument): boolean {
  return doc.matchType != null;
}
