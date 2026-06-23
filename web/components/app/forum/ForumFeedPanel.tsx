"use client";

import { LayoutGrid, List } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AdminPagination } from "@/components/app/admin/AdminPagination";
import {
  forumFiltersToQueryParams,
  ForumFiltersBar,
  type ForumFilterState,
} from "@/components/app/forum/ForumFiltersBar";
import { InternalDocumentGrid } from "@/components/app/forum/InternalDocumentGrid";
import { InternalDocumentList } from "@/components/app/forum/InternalDocumentList";
import { BrutalButton } from "@/components/ui/BrutalButton";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { usePublicDocuments } from "@/lib/queries/documents";
import { ErrorCode, getUserErrorCode } from "@/lib/errors";

const PAGE_LIMIT = 20;

type ViewMode = "grid" | "list";

interface ForumFeedPanelProps {
  filters: ForumFilterState;
  onFiltersChange: (filters: ForumFilterState) => void;
  page: number;
  onPageChange: (page: number) => void;
}

export function ForumFeedPanel({
  filters,
  onFiltersChange,
  page,
  onPageChange,
}: ForumFeedPanelProps) {
  const [view, setView] = useState<ViewMode>("grid");
  const router = useRouter();

  const { data, isLoading, isError, error, refetch } = usePublicDocuments({
    match: "auto",
    page,
    limit: PAGE_LIMIT,
    ...forumFiltersToQueryParams(filters),
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
        mode="forum"
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
        <InternalDocumentGrid
          documents={data?.documents ?? []}
          source="forum"
          variant="feed"
          isLoading={isLoading}
          isError={isError}
          onRetry={() => void refetch()}
          emptyDescription="Chưa có tài liệu phù hợp với hồ sơ học thuật của bạn."
        />
      ) : (
        <InternalDocumentList
          documents={data?.documents ?? []}
          source="forum"
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
