"use client";

import { FileText } from "lucide-react";
import Link from "next/link";

import { publicDocumentHref } from "@/components/app/library/PublicDocumentCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import type { PublicDocument } from "@/lib/queries/public-documents";
import { cn } from "@/lib/cn";

function formatBytes(bytes: number): string {
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  return `${(bytes / 1_024).toFixed(0)} KB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

interface PublicDocumentListProps {
  documents: PublicDocument[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  emptyDescription?: string;
  onOwnerClick?: (owner: { id: string; name: string }) => void;
}

export function PublicDocumentList({
  documents,
  isLoading,
  isError,
  onRetry,
  emptyDescription = "Thử nới bộ lọc hoặc quay lại sau.",
  onOwnerClick,
}: PublicDocumentListProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton h-16 rounded-xl" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-3">
        <ErrorAlert message="Không tải được danh sách tài liệu. Vui lòng thử lại." />
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="focus-brutal text-sm font-bold underline"
          >
            Tải lại
          </button>
        )}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <EmptyState
        icon={<FileText className="h-10 w-10" />}
        title="Không có tài liệu"
        description={emptyDescription}
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border-2 border-brutal-ink shadow-brutal">
      <table className="min-w-full text-sm" aria-label="Danh sách tài liệu công khai">
        <thead>
          <tr className="border-b-2 border-brutal-ink bg-brutal-bg text-left">
            <th scope="col" className="px-4 py-3 font-heading font-bold">
              Tài liệu
            </th>
            <th scope="col" className="hidden px-4 py-3 font-heading font-bold md:table-cell">
              CTĐT / Môn
            </th>
            <th scope="col" className="hidden px-4 py-3 font-heading font-bold sm:table-cell">
              Người đăng
            </th>
            <th scope="col" className="px-4 py-3 font-heading font-bold">
              Trạng thái
            </th>
          </tr>
        </thead>
        <tbody>
          {documents.map((doc) => {
            const course = doc.courseSlot;
            return (
              <tr
                key={doc.id}
                className={cn(
                  "border-b border-brutal-ink/10 transition-colors hover:bg-brutal-bg",
                )}
              >
                <td className="px-4 py-3">
                  <Link
                    href={publicDocumentHref(doc.id)}
                    className="focus-brutal block min-w-[200px]"
                  >
                    <p className="font-semibold text-brutal-ink hover:text-brutal-primary">
                      {doc.title}
                    </p>
                    <p className="text-xs text-brutal-muted">
                      {formatBytes(doc.fileSizeBytes)} · {formatDate(doc.createdAt)}
                    </p>
                  </Link>
                </td>
                <td className="hidden px-4 py-3 md:table-cell">
                  {course ? (
                    <div className="text-xs">
                      <p className="font-bold">{course.curriculum?.code ?? "—"}</p>
                      <p className="text-brutal-muted">
                        {course.semester?.code ?? "—"} · {course.subject?.code ?? "—"}
                      </p>
                    </div>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="hidden px-4 py-3 sm:table-cell">
                  {doc.owner && onOwnerClick ? (
                    <button
                      type="button"
                      className="focus-brutal max-w-[12rem] truncate font-semibold text-brutal-ink underline-offset-2 hover:underline"
                      onClick={() =>
                        onOwnerClick({
                          id: doc.owner!.id,
                          name: doc.owner!.displayName,
                        })
                      }
                    >
                      {doc.owner.displayName}
                    </button>
                  ) : (
                    (doc.owner?.displayName ?? "—")
                  )}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={doc.status} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
