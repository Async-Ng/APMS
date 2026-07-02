"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { AdminPagination } from "@/components/app/admin/AdminPagination";
import {
  suggestedFiltersToQueryParams,
  LibraryFiltersBar,
  type LibraryFilterState,
} from "@/components/app/library/LibraryFiltersBar";
import { PublicDocumentGrid } from "@/components/app/library/PublicDocumentGrid";
import { PublicDocumentList } from "@/components/app/library/PublicDocumentList";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { ViewToggle, type ViewMode } from "@/components/ui/ViewToggle";
import { usePublicDocuments } from "@/lib/queries/documents";
import { ErrorCode, getUserErrorCode } from "@/lib/errors";

const PAGE_LIMIT = 20;

interface LibrarySuggestedPanelProps {
  filters: LibraryFilterState;
  onFiltersChange: (filters: LibraryFilterState) => void;
  page: number;
  onPageChange: (page: number) => void;
}

export function LibrarySuggestedPanel({
  filters,
  onFiltersChange,
  page,
  onPageChange,
}: LibrarySuggestedPanelProps) {
  const [view, setView] = useState<ViewMode>("grid");
  const router = useRouter();

  const { data, isLoading, isError, error, refetch } = usePublicDocuments({
    match: "auto",
    page,
    limit: PAGE_LIMIT,
    ...suggestedFiltersToQueryParams(filters),
  });

  const errorCode = getUserErrorCode(error);
  const needsAcademicProfile =
    isError && errorCode === ErrorCode.ACADEMIC_PROFILE_REQUIRED;

  const pagination = data?.pagination ?? {
    page: 1,
    limit: PAGE_LIMIT,
    total: 0,
    totalPages: 1,
  };

  return (
    <div className="space-y-4">
      <LibraryFiltersBar
        mode="suggested"
        filters={filters}
        onChange={onFiltersChange}
        defaultSort="newest"
      />

      {needsAcademicProfile && (
        <ErrorAlert
          message="Hoàn thành hồ sơ học thuật để nhận gợi ý tài liệu phù hợp."
          actionLabel="Cập nhật hồ sơ"
          onAction={() => router.push("/profile")}
        />
      )}

      <ViewToggle view={view} onChange={setView} />

      {view === "grid" ? (
        <PublicDocumentGrid
          documents={data?.documents ?? []}
          variant="feed"
          isLoading={isLoading}
          isError={isError}
          onRetry={() => void refetch()}
          emptyDescription="Chưa có tài liệu phù hợp với hồ sơ học thuật của bạn."
        />
      ) : (
        <PublicDocumentList
          documents={data?.documents ?? []}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => void refetch()}
          emptyDescription="Chưa có tài liệu phù hợp với hồ sơ học thuật của bạn."
        />
      )}

      <AdminPagination
        pagination={pagination}
        onPageChange={onPageChange}
        itemLabel="tài liệu"
      />
    </div>
  );
}
