"use client";

import { FileText, Presentation } from "lucide-react";
import Link from "next/link";

import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/cn";
import type { PublicDocument } from "@/lib/queries/public-documents";

function formatBytes(bytes: number): string {
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  if (bytes >= 1_024) return `${(bytes / 1_024).toFixed(0)} KB`;
  return `${bytes} B`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.includes("presentation"))
    return <Presentation className="h-6 w-6 text-brutal-primary" strokeWidth={2} />;
  return <FileText className="h-6 w-6 text-brutal-danger" strokeWidth={2} />;
}

function fileIconBg(mimeType: string): string {
  if (mimeType.includes("pdf")) return "bg-red-50";
  if (mimeType.includes("presentation")) return "bg-brutal-primary/10";
  return "bg-brutal-secondary/15";
}

export function publicDocumentHref(id: string) {
  return `/documents/${id}?from=public`;
}

export interface OwnerClickTarget {
  id: string;
  name: string;
}

interface PublicDocumentCardProps {
  doc: PublicDocument;
  variant?: "feed" | "browse";
  onOwnerClick?: (owner: OwnerClickTarget) => void;
}

export function PublicDocumentCard({
  doc,
  variant = "feed",
  onOwnerClick,
}: PublicDocumentCardProps) {
  const course = doc.courseSlot;
  const owner = doc.owner;

  return (
    <article className="brutal-card group flex h-full flex-col gap-3 p-4 transition-all hover:-translate-y-0.5 hover:shadow-brutal">
      <Link
        href={publicDocumentHref(doc.id)}
        className="focus-brutal flex flex-1 flex-col gap-3 outline-none"
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-brutal-ink shadow-brutal-sm",
              fileIconBg(doc.mimeType),
            )}
          >
            <FileIcon mimeType={doc.mimeType} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 font-heading text-base font-extrabold leading-snug text-brutal-ink group-hover:text-brutal-primary">
              {doc.title}
            </h3>
            <p className="mt-0.5 text-xs text-brutal-muted">
              {formatBytes(doc.fileSizeBytes)}
              {doc.pageCount ? ` · ${doc.pageCount} trang` : ""}
            </p>
          </div>
          <StatusBadge status={doc.status} />
        </div>

        {course && (
          <div className="flex flex-wrap items-center gap-1.5">
            {course.curriculum && (
              <span className="rounded-md border border-brutal-ink bg-brutal-bg px-2 py-0.5 text-xs font-bold">
                {course.curriculum.code}
              </span>
            )}
            <span className="rounded-md border border-brutal-ink bg-brutal-accent/20 px-2 py-0.5 text-xs font-bold">
              {course.semester?.code ?? "—"}
            </span>
            {course.subject && (
              <span className="rounded-md border border-brutal-ink bg-brutal-secondary/15 px-2 py-0.5 text-xs font-bold">
                {course.subject.code}
              </span>
            )}
          </div>
        )}

        {variant === "browse" && (
          <div className="mt-auto space-y-1 border-t border-brutal-ink/10 pt-3 text-xs text-brutal-muted">
            {course?.subject && (
              <p className="font-semibold text-brutal-ink">{course.subject.name}</p>
            )}
            <p>{formatDate(doc.createdAt)}</p>
          </div>
        )}
      </Link>

      {variant === "feed" && owner && (
        <div className="mt-auto flex items-center gap-2 border-t border-brutal-ink/10 pt-3">
          {onOwnerClick ? (
            <button
              type="button"
              className="focus-brutal flex min-w-0 flex-1 items-center gap-2 rounded-lg text-left hover:opacity-80"
              onClick={() => onOwnerClick({ id: owner.id, name: owner.displayName })}
            >
              <OwnerAvatar owner={owner} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold underline-offset-2 hover:underline">
                  {owner.displayName}
                </p>
                <p className="text-xs text-brutal-muted">{formatDate(doc.createdAt)}</p>
              </div>
            </button>
          ) : (
            <>
              <OwnerAvatar owner={owner} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{owner.displayName}</p>
                <p className="text-xs text-brutal-muted">{formatDate(doc.createdAt)}</p>
              </div>
            </>
          )}
        </div>
      )}

      {variant === "browse" && owner && onOwnerClick && (
        <button
          type="button"
          className="focus-brutal -mt-1 max-w-full truncate text-left text-xs font-semibold text-brutal-ink underline-offset-2 hover:underline"
          onClick={() => onOwnerClick({ id: owner.id, name: owner.displayName })}
        >
          {owner.displayName}
        </button>
      )}
    </article>
  );
}

function OwnerAvatar({
  owner,
}: {
  owner: { displayName: string; avatarUrl: string | null };
}) {
  if (owner.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={owner.avatarUrl}
        alt=""
        className="h-7 w-7 rounded-lg border-2 border-brutal-ink object-cover"
      />
    );
  }
  return (
    <div className="flex h-7 w-7 items-center justify-center rounded-lg border-2 border-brutal-ink bg-brutal-secondary text-xs font-bold text-white">
      {owner.displayName.charAt(0).toUpperCase()}
    </div>
  );
}
