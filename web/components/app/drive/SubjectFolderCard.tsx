"use client";

import { Folder } from "lucide-react";
import Link from "next/link";

import type { CatalogSubject } from "@/lib/queries/catalog";
import { cn } from "@/lib/cn";

const SUBJECT_ICON_COLORS = [
  "var(--color-fpt-orange)",
  "#3b82f6",
  "#8b5cf6",
  "#10b981",
  "#f59e0b",
] as const;

function subjectIconColor(subjectId: string): string {
  let hash = 0;
  for (let i = 0; i < subjectId.length; i += 1) {
    hash = subjectId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return SUBJECT_ICON_COLORS[Math.abs(hash) % SUBJECT_ICON_COLORS.length] ?? SUBJECT_ICON_COLORS[0];
}

interface SubjectFolderCardProps {
  subject: CatalogSubject;
  courseSlotId: string;
  documentCount?: number;
}

export function SubjectFolderCard({
  subject,
  courseSlotId,
  documentCount = 0,
}: SubjectFolderCardProps) {
  const label = `${subject.code} — ${subject.name}`;

  return (
    <div
      className={cn(
        "brutal-card brutal-card-hover group relative flex flex-col gap-2 p-3",
        "cursor-pointer select-none",
      )}
    >
      <Link
        href={`/drive/subject/${courseSlotId}`}
        className="focus-brutal absolute inset-0 rounded-2xl"
        aria-label={`Mở môn ${label}`}
        title={label}
      />

      <div className="flex items-start justify-between gap-2">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-brutal-ink shadow-brutal-sm"
          style={{ backgroundColor: subjectIconColor(subject.id) }}
          aria-hidden="true"
        >
          <Folder className="h-6 w-6 text-white" strokeWidth={2} />
        </div>

        {documentCount > 0 && (
          <span className="relative z-10 rounded-full border-2 border-brutal-ink bg-brutal-bg px-2 py-0.5 text-xs font-bold tabular-nums text-brutal-ink">
            {documentCount}
          </span>
        )}
      </div>

      <p className="truncate text-sm font-bold leading-snug text-brutal-ink">
        {subject.code}
      </p>
    </div>
  );
}
