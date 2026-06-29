"use client";

import { FileText, Folder, Globe } from "lucide-react";
import Link from "next/link";

import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/cn";
import type { DriveDocument, DriveFolder } from "@/lib/queries/drive";
import { formatBytes } from "@/lib/format";

export interface DriveSubjectListEntry {
  curriculumCourseId: string;
  label: string;
  documentCount?: number;
}

interface DriveListViewProps {
  subjects?: DriveSubjectListEntry[];
  folders?: Array<{
    folder: DriveFolder;
    href?: string;
  }>;
  documents?: DriveDocument[];
  className?: string;
}

function folderIconColor(color: string | null): string {
  return color ?? "var(--color-fpt-orange)";
}

export function DriveListView({
  subjects = [],
  folders = [],
  documents = [],
  className,
}: DriveListViewProps) {
  if (subjects.length === 0 && folders.length === 0 && documents.length === 0) {
    return null;
  }

  return (
    <ul className={cn("divide-y-2 divide-brutal-ink/10 rounded-xl border-2 border-brutal-ink bg-brutal-surface", className)}>
      {subjects.map((subject) => (
        <li key={subject.curriculumCourseId}>
          <Link
            href={`/drive/subject/${subject.curriculumCourseId}`}
            className="focus-brutal flex items-center gap-3 px-4 py-3 transition-colors hover:bg-brutal-bg"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border-2 border-brutal-ink bg-brutal-primary">
              <Folder className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-brutal-ink">{subject.label}</p>
              <p className="text-xs text-brutal-muted">
                Môn học
                {subject.documentCount != null && subject.documentCount > 0
                  ? ` · ${subject.documentCount} tệp`
                  : ""}
              </p>
            </div>
          </Link>
        </li>
      ))}
      {folders.map(({ folder, href }) => (
        <li key={folder.id}>
          <Link
            href={href ?? `/drive/${folder.id}`}
            className="focus-brutal flex items-center gap-3 px-4 py-3 transition-colors hover:bg-brutal-bg"
          >
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border-2 border-brutal-ink"
              style={{ backgroundColor: folderIconColor(folder.color) }}
              aria-hidden="true"
            >
              <Folder className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-brutal-ink">{folder.name}</p>
              <p className="text-xs text-brutal-muted">Thư mục</p>
            </div>
          </Link>
        </li>
      ))}
      {documents.map((doc) => (
        <li key={doc.id}>
          <Link
            href={`/documents/${doc.id}`}
            className="focus-brutal flex items-center gap-3 px-4 py-3 transition-colors hover:bg-brutal-bg"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border-2 border-brutal-ink bg-brutal-bg">
              <FileText className="h-4 w-4 text-brutal-secondary" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-brutal-ink">{doc.title}</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <StatusBadge status={doc.status} />
                {doc.visibility === "public" && (
                  <span className="inline-flex items-center gap-0.5 text-xs text-brutal-muted">
                    <Globe className="h-3 w-3" />
                    Công khai
                  </span>
                )}
              </div>
            </div>
            <span className="shrink-0 text-xs tabular-nums text-brutal-muted">
              {formatBytes(doc.fileSizeBytes)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
