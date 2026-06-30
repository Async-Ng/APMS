"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { AdminPagination } from "@/components/app/admin/AdminPagination";
import {
  browseFiltersToQueryParams,
  LibraryFiltersBar,
  type LibraryFilterState,
} from "@/components/app/library/LibraryFiltersBar";
import { PublicDocumentGrid } from "@/components/app/library/PublicDocumentGrid";
import { PublicDocumentList } from "@/components/app/library/PublicDocumentList";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { ViewToggle, type ViewMode } from "@/components/ui/ViewToggle";
import { ErrorCode, getUserErrorCode } from "@/lib/errors";
import { usePublicDocuments } from "@/lib/queries/documents";

const PAGE_LIMIT = 20;

interface LibraryBrowsePanelProps {
  filters: LibraryFilterState;
  onFiltersChange: (filters: LibraryFilterState) => void;
  page: number;
  onPageChange: (page: number) => void;
}

export function LibraryBrowsePanel({
  filters,
  onFiltersChange,
  page,
  onPageChange,
}: LibraryBrowsePanelProps) {
  const [view, setView] = useState<ViewMode>("list");
  const router = useRouter();

  const { data, isLoading, isError, error, refetch } = usePublicDocuments({
    match: "all",
    page,
    limit: PAGE_LIMIT,
    ...browseFiltersToQueryParams(filters),
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
        mode="browse"
        filters={filters}
        onChange={(next) => {
          onFiltersChange(next);
          onPageChange(1);
        }}
        defaultSort="title"
      />

      {needsAcademicProfile && (
        <ErrorAlert
          message="Hoàn thành hồ sơ học thuật để duyệt thư viện công khai."
          actionLabel="Cập nhật hồ sơ"
          onAction={() => router.push("/profile")}
        />
      )}

      <ViewToggle view={view} onChange={setView} />

      {view === "grid" ? (
        <PublicDocumentGrid
          documents={data?.documents ?? []}
          source="browse"
          variant="browse"
          isLoading={isLoading}
          isError={isError}
          onRetry={() => void refetch()}
        />
      ) : (
        <PublicDocumentList
          documents={data?.documents ?? []}
          source="browse"
          isLoading={isLoading}
          isError={isError}
          onRetry={() => void refetch()}
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
