"use client";

import { FileText } from "lucide-react";

import { InternalDocumentCard } from "@/components/app/forum/InternalDocumentCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { SkeletonGrid } from "@/components/ui/SkeletonCard";
import type { InternalDocument, InternalSource } from "@/lib/queries/internal-documents";

interface InternalDocumentGridProps {
  documents: InternalDocument[];
  source: InternalSource;
  variant?: "feed" | "browse";
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

export function InternalDocumentGrid({
  documents,
  source,
  variant = "feed",
  isLoading,
  isError,
  onRetry,
}: InternalDocumentGridProps) {
  if (isLoading) {
    return <SkeletonGrid count={6} />;
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
        description="Thử nới bộ lọc hoặc quay lại sau khi có tài liệu mới được chia sẻ."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {documents.map((doc) => (
        <InternalDocumentCard
          key={doc.id}
          doc={doc}
          source={source}
          variant={variant}
        />
      ))}
    </div>
  );
}
