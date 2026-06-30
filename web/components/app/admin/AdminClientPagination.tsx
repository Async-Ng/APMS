"use client";

import { AdminPagination } from "@/components/app/admin/AdminPagination";
import type { Pagination } from "@/lib/queries/admin";

interface AdminClientPaginationProps {
  pagination: Pagination;
  onPageChange: (page: number) => void;
  itemLabel?: string;
}

export function AdminClientPagination({
  pagination,
  onPageChange,
  itemLabel = "mục",
}: AdminClientPaginationProps) {
  return (
    <AdminPagination
      pagination={pagination}
      onPageChange={onPageChange}
      itemLabel={itemLabel}
    />
  );
}
