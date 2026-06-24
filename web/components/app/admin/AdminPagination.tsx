"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { BrutalButton } from "@/components/ui/BrutalButton";
import type { Pagination } from "@/lib/queries/admin";

interface AdminPaginationProps {
  pagination: Pagination;
  onPageChange: (page: number) => void;
  itemLabel?: string;
}

export function AdminPagination({
  pagination,
  onPageChange,
  itemLabel = "mục",
}: AdminPaginationProps) {
  const { page, totalPages, total } = pagination;

  if (totalPages <= 1) {
    if (total > 0) {
      return (
        <p className="text-sm text-brutal-muted">
          {total} {itemLabel}
        </p>
      );
    }
    return null;
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <p className="text-sm text-brutal-muted">
        Trang {page} / {totalPages}
        <span className="hidden sm:inline">
          {" "}
          — {total} {itemLabel}
        </span>
      </p>
      <div className="flex gap-2">
        <BrutalButton
          variant="ghost"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Trang trước"
          className="px-2"
        >
          <ChevronLeft className="h-4 w-4" />
        </BrutalButton>
        <BrutalButton
          variant="ghost"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Trang sau"
          className="px-2"
        >
          <ChevronRight className="h-4 w-4" />
        </BrutalButton>
      </div>
    </div>
  );
}
