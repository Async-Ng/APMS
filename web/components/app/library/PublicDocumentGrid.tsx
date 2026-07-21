"use client";

import { FileText } from "lucide-react";

import { PublicDocumentCard } from "@/components/app/library/PublicDocumentCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { SkeletonGrid } from "@/components/ui/SkeletonCard";
import type { PublicDocument } from "@/lib/queries/public-documents";

interface PublicDocumentGridProps {
  documents: PublicDocument[];
  variant?: "feed" | "browse";
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  emptyDescription?: string;
  onOwnerClick?: (owner: { id: string; name: string }) => void;
}

export function PublicDocumentGrid({
  documents,
  variant = "feed",
  isLoading,
  isError,
  onRetry,
  emptyDescription = "Thử nới bộ lọc hoặc quay lại sau khi có tài liệu mới được chia sẻ.",
  onOwnerClick,
}: PublicDocumentGridProps) {
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
        description={emptyDescription}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {documents.map((doc) => (
        <PublicDocumentCard
          key={doc.id}
          doc={doc}
          variant={variant}
          onOwnerClick={onOwnerClick}
        />
      ))}
    </div>
  );
}
