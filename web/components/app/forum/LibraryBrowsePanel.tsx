"use client";

import { LayoutGrid, List } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AdminPagination } from "@/components/app/admin/AdminPagination";
import {
  filtersToQueryParams,
  ForumFiltersBar,
  type ForumFilterState,
} from "@/components/app/forum/ForumFiltersBar";
import { InternalDocumentGrid } from "@/components/app/forum/InternalDocumentGrid";
import { InternalDocumentList } from "@/components/app/forum/InternalDocumentList";
import { BrutalButton } from "@/components/ui/BrutalButton";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { ErrorCode, getUserErrorCode } from "@/lib/errors";
import { useLibraryDocuments } from "@/lib/queries/library";

const PAGE_LIMIT = 20;

type ViewMode = "grid" | "list";

interface LibraryBrowsePanelProps {
  filters: ForumFilterState;
  onFiltersChange: (filters: ForumFilterState) => void;
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

  const { data, isLoading, isError, error, refetch } = useLibraryDocuments({
    page,
    limit: PAGE_LIMIT,
    ...filtersToQueryParams(filters),
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
      <ForumFiltersBar
        filters={filters}
        onChange={(next) => {
          onFiltersChange(next);
          onPageChange(1);
        }}
        defaultSort="title"
      />

      {needsAcademicProfile && (
        <ErrorAlert
          message="Hoàn thành hồ sơ học thuật để xem Thư viện tài liệu nội bộ."
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
        <InternalDocumentGrid
          documents={data?.documents ?? []}
          source="library"
          variant="browse"
          isLoading={isLoading}
          isError={isError}
          onRetry={() => void refetch()}
        />
      ) : (
        <InternalDocumentList
          documents={data?.documents ?? []}
          source="library"
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
