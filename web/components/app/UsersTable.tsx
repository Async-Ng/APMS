"use client";

import { Eye } from "lucide-react";
import { useCallback, useState } from "react";

import { AdminPagination } from "@/components/app/admin/AdminPagination";
import { AdminSearchBar } from "@/components/app/admin/AdminSearchBar";
import {
  AdminTableShell,
  AdminTableSkeleton,
} from "@/components/app/admin/AdminTableShell";
import { UserDetailModal } from "@/components/app/admin/UserDetailModal";
import { BrutalButton } from "@/components/ui/BrutalButton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { getUserErrorMessage } from "@/lib/errors";
import type { AdminUser } from "@/lib/queries/admin";
import { useAdminUsers, useUpdateAdminUser } from "@/lib/queries/admin";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/cn";

const PAGE_LIMIT = 10;

type StatusFilter = "all" | "active" | "disabled";

function formatBytes(bytes: number): string {
  if (bytes >= 1_073_741_824)
    return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(0)} MB`;
  return `${bytes} B`;
}

function QuotaCell({
  user,
  onUpdate,
  isSaving,
}: {
  user: AdminUser;
  onUpdate: (userId: string, quota: number) => void;
  isSaving: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(
    String(Math.round(user.storageQuotaBytes / 1_048_576)),
  );

  function commit() {
    const mb = parseInt(value, 10);
    if (!isNaN(mb) && mb > 0) {
      onUpdate(user.id, mb * 1_048_576);
    }
    setEditing(false);
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        disabled={isSaving}
        className="focus-brutal rounded px-2 py-1 text-sm tabular-nums underline-offset-2 hover:underline disabled:opacity-50"
        title="Nhấn để sửa hạn mức"
      >
        {isSaving ? "…" : formatBytes(user.storageQuotaBytes)}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && commit()}
        className="focus-brutal w-20 rounded border-2 border-brutal-ink px-2 py-1 text-sm tabular-nums"
        aria-label="Hạn mức lưu trữ (MB)"
        autoFocus
        min="1"
      />
      <span className="text-xs text-brutal-muted">MB</span>
    </div>
  );
}

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "active", label: "Hoạt động" },
  { id: "disabled", label: "Vô hiệu" },
];

export function UsersTable() {
  const currentUser = useAuthStore((s) => s.user);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [detailUserId, setDetailUserId] = useState<string | null>(null);
  const [confirmDisable, setConfirmDisable] = useState<AdminUser | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [savingQuotaId, setSavingQuotaId] = useState<string | null>(null);

  const { data, isLoading, isError } = useAdminUsers({
    page,
    limit: PAGE_LIMIT,
    search: search || undefined,
  });

  const { mutate: updateUser, isPending } = useUpdateAdminUser();

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const handleUpdateQuota = useCallback(
    (userId: string, quotaBytes: number) => {
      setMutationError(null);
      setSavingQuotaId(userId);
      updateUser(
        { userId, body: { storageQuotaBytes: quotaBytes } },
        {
          onSuccess: () => setSavingQuotaId(null),
          onError: (err) => {
            setSavingQuotaId(null);
            setMutationError(getUserErrorMessage(err));
          },
        },
      );
    },
    [updateUser],
  );

  const handleToggleDisable = useCallback(
    (user: AdminUser) => {
      if (user.isDisabled) {
        setMutationError(null);
        updateUser(
          { userId: user.id, body: { isDisabled: false } },
          { onError: (err) => setMutationError(getUserErrorMessage(err)) },
        );
        return;
      }
      setConfirmDisable(user);
    },
    [updateUser],
  );

  const confirmDisableUser = () => {
    if (!confirmDisable) return;
    setMutationError(null);
    updateUser(
      { userId: confirmDisable.id, body: { isDisabled: true } },
      {
        onSuccess: () => setConfirmDisable(null),
        onError: (err) => {
          setMutationError(getUserErrorMessage(err));
          setConfirmDisable(null);
        },
      },
    );
  };

  const filteredUsers =
    data?.users.filter((u) => {
      if (statusFilter === "active") return !u.isDisabled;
      if (statusFilter === "disabled") return u.isDisabled;
      return true;
    }) ?? [];

  const pagination = data?.pagination ?? {
    page: 1,
    limit: PAGE_LIMIT,
    total: 0,
    totalPages: 1,
  };

  return (
    <div className="space-y-4">
      {mutationError && (
        <ErrorAlert
          message={mutationError}
          actionLabel="Đóng"
          onAction={() => setMutationError(null)}
        />
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <AdminSearchBar
          value={search}
          onChange={handleSearch}
          placeholder="Tìm theo email hoặc tên…"
          id="admin-user-search"
        />
        <div className="flex flex-wrap gap-2" role="group" aria-label="Lọc trạng thái">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setStatusFilter(f.id)}
              className={cn(
                "focus-brutal rounded-lg border-2 border-brutal-ink px-3 py-1.5 text-xs font-bold",
                statusFilter === f.id
                  ? "bg-brutal-primary text-brutal-on-brand"
                  : "bg-brutal-surface hover:bg-brutal-bg",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <AdminTableShell ariaLabel="Bảng quản lý người dùng">
        <thead>
          <tr className="border-b-2 border-brutal-ink bg-brutal-bg">
            <th scope="col" className="px-4 py-3 text-left font-heading font-bold">
              Người dùng
            </th>
            <th scope="col" className="px-4 py-3 text-left font-heading font-bold">
              Vai trò
            </th>
            <th scope="col" className="px-4 py-3 text-left font-heading font-bold">
              Đã dùng
            </th>
            <th scope="col" className="px-4 py-3 text-left font-heading font-bold">
              Hạn mức
            </th>
            <th scope="col" className="px-4 py-3 text-left font-heading font-bold">
              Trạng thái
            </th>
            <th scope="col" className="px-4 py-3 text-left font-heading font-bold">
              Thao tác
            </th>
          </tr>
        </thead>
        <tbody>
          {isLoading && <AdminTableSkeleton cols={6} />}

          {isError && (
            <tr>
              <td colSpan={6} className="px-4 py-6 text-center text-sm text-brutal-danger">
                Không tải được danh sách người dùng. Vui lòng thử lại.
              </td>
            </tr>
          )}

          {!isLoading &&
            !isError &&
            filteredUsers.map((user) => {
              const isSelf = currentUser?.id === user.id;
              return (
                <tr
                  key={user.id}
                  className={cn(
                    "border-b border-brutal-ink/10 transition-colors hover:bg-brutal-bg",
                    user.isDisabled && "opacity-60",
                  )}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      {user.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={user.avatarUrl}
                          alt=""
                          width={32}
                          height={32}
                          className="h-8 w-8 rounded-lg border-2 border-brutal-ink object-cover"
                        />
                      ) : (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-brutal-ink bg-brutal-secondary text-xs font-bold text-white">
                          {user.displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-brutal-ink">
                          {user.displayName}
                          {isSelf && (
                            <span className="ml-1 text-xs text-brutal-muted">(bạn)</span>
                          )}
                        </p>
                        <p className="truncate text-xs text-brutal-muted">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold",
                        user.role === "admin"
                          ? "border-brutal-secondary bg-brutal-secondary/10 text-brutal-secondary"
                          : "border-brutal-ink/20 bg-brutal-bg text-brutal-muted",
                      )}
                    >
                      {user.role === "admin" ? "quản trị" : "người dùng"}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-brutal-muted">
                    {formatBytes(user.storageUsedBytes)}
                  </td>
                  <td className="px-4 py-3">
                    <QuotaCell
                      user={user}
                      onUpdate={handleUpdateQuota}
                      isSaving={savingQuotaId === user.id}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold",
                        user.isDisabled
                          ? "border-brutal-danger bg-red-50 text-brutal-danger"
                          : "status-ready",
                      )}
                    >
                      {user.isDisabled ? "Vô hiệu" : "Hoạt động"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <BrutalButton
                        variant="ghost"
                        onClick={() => setDetailUserId(user.id)}
                        className="px-2 py-1 text-xs"
                        aria-label={`Chi tiết ${user.displayName}`}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </BrutalButton>
                      {!isSelf && (
                        <BrutalButton
                          variant={user.isDisabled ? "secondary" : "ghost"}
                          onClick={() => handleToggleDisable(user)}
                          disabled={isPending}
                          className="px-3 py-1 text-xs"
                        >
                          {user.isDisabled ? "Kích hoạt" : "Vô hiệu"}
                        </BrutalButton>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}

          {!isLoading && !isError && filteredUsers.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-10 text-center text-sm text-brutal-muted">
                Không tìm thấy người dùng.
              </td>
            </tr>
          )}
        </tbody>
      </AdminTableShell>

      <AdminPagination
        pagination={pagination}
        onPageChange={setPage}
        itemLabel="người dùng"
      />

      <UserDetailModal
        userId={detailUserId}
        onClose={() => setDetailUserId(null)}
      />

      <ConfirmDialog
        open={!!confirmDisable}
        title="Vô hiệu hóa người dùng?"
        description={
          confirmDisable
            ? `${confirmDisable.displayName} (${confirmDisable.email}) sẽ không thể truy cập Drive, tài liệu và chat. Họ vẫn có thể đăng nhập nhưng chỉ xem được hồ sơ.`
            : ""
        }
        confirmLabel="Vô hiệu hóa"
        tone="danger"
        isPending={isPending}
        onConfirm={confirmDisableUser}
        onClose={() => setConfirmDisable(null)}
      />
    </div>
  );
}
