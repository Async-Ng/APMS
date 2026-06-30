"use client";

import { LayoutGrid, List } from "lucide-react";
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
import { BrutalButton } from "@/components/ui/BrutalButton";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { usePublicDocuments } from "@/lib/queries/documents";
import { ErrorCode, getUserErrorCode } from "@/lib/errors";

const PAGE_LIMIT = 20;

type ViewMode = "grid" | "list";

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
        onChange={(next) => {
          onFiltersChange(next);
          onPageChange(1);
        }}
        defaultSort="newest"
      />

      {needsAcademicProfile && (
        <ErrorAlert
          message="Hoàn thành hồ sơ học thuật để nhận gợi ý tài liệu phù hợp."
          actionLabel="Cập nhật hồ sơ"
          onAction={() => router.push("/profile")}
        />
      )}

      <div className="flex items-center justify-end gap-2">
        <BrutalButton
          variant={view === "grid" ? "secondary" : "ghost"}
          className="px-2 py-1"
          onClick={() => setView("grid")}
          aria-label="Xem dạng lưới"
        >
          <LayoutGrid className="h-4 w-4" />
        </BrutalButton>
        <BrutalButton
          variant={view === "list" ? "secondary" : "ghost"}
          className="px-2 py-1"
          onClick={() => setView("list")}
          aria-label="Xem dạng danh sách"
        >
          <List className="h-4 w-4" />
        </BrutalButton>
      </div>

      {view === "grid" ? (
        <PublicDocumentGrid
          documents={data?.documents ?? []}
          source="suggested"
          variant="feed"
          isLoading={isLoading}
          isError={isError}
          onRetry={() => void refetch()}
          emptyDescription="Chưa có tài liệu phù hợp với hồ sơ học thuật của bạn."
        />
      ) : (
        <PublicDocumentList
          documents={data?.documents ?? []}
          source="suggested"
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
