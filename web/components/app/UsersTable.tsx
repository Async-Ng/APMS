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
import { formatBytes } from "@/lib/format";
import type { AdminUser } from "@/lib/queries/admin";
import { useAdminUsers, useUpdateAdminUser } from "@/lib/queries/admin";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/cn";

const PAGE_LIMIT = 10;

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
  const [inlineError, setInlineError] = useState<string | null>(null);

  const minMb = Math.ceil(user.storageUsedBytes / 1_048_576);

  function commit() {
    const mb = parseInt(value, 10);
    if (isNaN(mb) || mb <= 0) {
      setInlineError("Nhập số MB hợp lệ");
      return;
    }
    if (mb < minMb) {
      setInlineError(`Hạn mức phải ≥ ${minMb} MB đã dùng`);
      return;
    }
    setInlineError(null);
    onUpdate(user.id, mb * 1_048_576);
    setEditing(false);
  }

  if (!editing) {
    return (
      <button
        onClick={() => {
          setValue(String(Math.round(user.storageQuotaBytes / 1_048_576)));
          setInlineError(null);
          setEditing(true);
        }}
        disabled={isSaving}
        className="focus-brutal rounded px-2 py-1 text-sm tabular-nums underline-offset-2 hover:underline disabled:opacity-50"
        title="Nhấn để sửa hạn mức"
      >
        {isSaving ? "…" : formatBytes(user.storageQuotaBytes)}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setInlineError(null);
          }}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && commit()}
          className="focus-brutal w-20 rounded border-2 border-brutal-ink px-2 py-1 text-sm tabular-nums"
          aria-label="Hạn mức lưu trữ (MB)"
          aria-invalid={!!inlineError}
          autoFocus
          min={minMb}
        />
        <span className="text-xs text-brutal-muted">MB</span>
      </div>
      {inlineError && (
        <p className="text-xs font-medium text-brutal-danger">{inlineError}</p>
      )}
    </div>
  );
}

interface UserRowActionsProps {
  user: AdminUser;
  isSelf: boolean;
  isRowPending: boolean;
  onToggleDisable: (user: AdminUser) => void;
  onViewDetail: (userId: string) => void;
}

function UserRowActions({
  user,
  isSelf,
  isRowPending,
  onToggleDisable,
  onViewDetail,
}: UserRowActionsProps) {
  return (
    <div className="flex flex-wrap gap-1">
      <BrutalButton
        variant="ghost"
        onClick={() => onViewDetail(user.id)}
        className="px-2 py-1 text-xs"
        aria-label={`Chi tiết ${user.displayName}`}
      >
        <Eye className="h-3.5 w-3.5" />
      </BrutalButton>
      {!isSelf && (
        <BrutalButton
          variant={user.isDisabled ? "secondary" : "ghost"}
          onClick={() => onToggleDisable(user)}
          disabled={isRowPending}
          className="px-3 py-1 text-xs"
          aria-label={
            user.isDisabled
              ? `Kích hoạt ${user.displayName}`
              : `Vô hiệu ${user.displayName}`
          }
        >
          {user.isDisabled ? "Kích hoạt" : "Vô hiệu"}
        </BrutalButton>
      )}
    </div>
  );
}

interface UserRoleCellProps {
  user: AdminUser;
  isSelf: boolean;
  isRowPending: boolean;
  onToggleRole: (user: AdminUser) => void;
}

function UserRoleCell({ user, isSelf, isRowPending, onToggleRole }: UserRoleCellProps) {
  if (isSelf) {
    return (
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
    );
  }

  return (
    <BrutalButton
      variant={user.role === "admin" ? "secondary" : "ghost"}
      className="px-3 py-1 text-xs"
      onClick={() => onToggleRole(user)}
      disabled={isRowPending || user.isDisabled}
      title={
        user.isDisabled
          ? "Không thể đổi vai trò tài khoản đã vô hiệu"
          : undefined
      }
    >
      {user.role === "admin" ? "Thu hồi quản trị" : "Cấp quản trị"}
    </BrutalButton>
  );
}

interface UserTableRowProps {
  user: AdminUser;
  isSelf: boolean;
  isRowPending: boolean;
  isSavingQuota: boolean;
  onUpdateQuota: (userId: string, quota: number) => void;
  onToggleRole: (user: AdminUser) => void;
  onToggleDisable: (user: AdminUser) => void;
  onViewDetail: (userId: string) => void;
}

function UserTableRow({
  user,
  isSelf,
  isRowPending,
  isSavingQuota,
  onUpdateQuota,
  onToggleRole,
  onToggleDisable,
  onViewDetail,
}: UserTableRowProps) {
  return (
    <tr
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
            <p className="truncate text-xs text-brutal-muted">{user.email}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <UserRoleCell
          user={user}
          isSelf={isSelf}
          isRowPending={isRowPending}
          onToggleRole={onToggleRole}
        />
      </td>
      <td className="px-4 py-3 tabular-nums text-brutal-muted">
        {formatBytes(user.storageUsedBytes)}
      </td>
      <td className="px-4 py-3">
        <QuotaCell
          user={user}
          onUpdate={onUpdateQuota}
          isSaving={isSavingQuota}
        />
      </td>
      <td className="px-4 py-3">
        <span
          className={cn(
            "inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold",
            user.isDisabled
              ? "border-brutal-danger bg-brutal-danger/10 text-brutal-danger"
              : "status-ready",
          )}
        >
          {user.isDisabled ? "Vô hiệu" : "Hoạt động"}
        </span>
      </td>
      <td className="px-4 py-3">
        <UserRowActions
          user={user}
          isSelf={isSelf}
          isRowPending={isRowPending}
          onToggleDisable={onToggleDisable}
          onViewDetail={onViewDetail}
        />
      </td>
    </tr>
  );
}

interface UserCardProps {
  user: AdminUser;
  isSelf: boolean;
  isRowPending: boolean;
  isSavingQuota: boolean;
  onUpdateQuota: (userId: string, quota: number) => void;
  onToggleRole: (user: AdminUser) => void;
  onToggleDisable: (user: AdminUser) => void;
  onViewDetail: (userId: string) => void;
}

function UserCard({
  user,
  isSelf,
  isRowPending,
  isSavingQuota,
  onUpdateQuota,
  onToggleRole,
  onToggleDisable,
  onViewDetail,
}: UserCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border-2 border-brutal-ink bg-brutal-surface p-4 shadow-brutal-sm",
        user.isDisabled && "opacity-60",
      )}
    >
      <div className="flex items-start gap-3">
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatarUrl}
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 rounded-lg border-2 border-brutal-ink object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-2 border-brutal-ink bg-brutal-secondary text-sm font-bold text-white">
            {user.displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-brutal-ink">
            {user.displayName}
            {isSelf && (
              <span className="ml-1 text-xs text-brutal-muted">(bạn)</span>
            )}
          </p>
          <p className="truncate text-xs text-brutal-muted">{user.email}</p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold",
            user.isDisabled
              ? "border-brutal-danger bg-brutal-danger/10 text-brutal-danger"
              : "status-ready",
          )}
        >
          {user.isDisabled ? "Vô hiệu" : "Hoạt động"}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-xs font-bold text-brutal-muted">Vai trò</p>
          <div className="mt-1">
            <UserRoleCell
              user={user}
              isSelf={isSelf}
              isRowPending={isRowPending}
              onToggleRole={onToggleRole}
            />
          </div>
        </div>
        <div>
          <p className="text-xs font-bold text-brutal-muted">Đã dùng</p>
          <p className="mt-1 tabular-nums text-brutal-ink">
            {formatBytes(user.storageUsedBytes)}
          </p>
        </div>
        <div className="col-span-2">
          <p className="text-xs font-bold text-brutal-muted">Hạn mức</p>
          <div className="mt-1">
            <QuotaCell
              user={user}
              onUpdate={onUpdateQuota}
              isSaving={isSavingQuota}
            />
          </div>
        </div>
      </div>

      <div className="mt-3 border-t border-brutal-ink/10 pt-3">
        <UserRowActions
          user={user}
          isSelf={isSelf}
          isRowPending={isRowPending}
          onToggleDisable={onToggleDisable}
          onViewDetail={onViewDetail}
        />
      </div>
    </div>
  );
}

export function UsersTable() {
  const currentUser = useAuthStore((s) => s.user);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [detailUserId, setDetailUserId] = useState<string | null>(null);
  const [confirmDisable, setConfirmDisable] = useState<AdminUser | null>(null);
  const [confirmDemote, setConfirmDemote] = useState<AdminUser | null>(null);
  const [confirmGrant, setConfirmGrant] = useState<AdminUser | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [savingQuotaId, setSavingQuotaId] = useState<string | null>(null);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  const { data, isLoading, isError } = useAdminUsers({
    page,
    limit: PAGE_LIMIT,
    search: search || undefined,
  });

  const { mutate: updateUser, isPending } = useUpdateAdminUser();

  const isRowPending = (userId: string) => pendingUserId === userId;

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
        setPendingUserId(user.id);
        updateUser(
          { userId: user.id, body: { isDisabled: false } },
          {
            onSettled: () => setPendingUserId(null),
            onError: (err) => setMutationError(getUserErrorMessage(err)),
          },
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
    setPendingUserId(confirmDisable.id);
    updateUser(
      { userId: confirmDisable.id, body: { isDisabled: true } },
      {
        onSuccess: () => setConfirmDisable(null),
        onSettled: () => setPendingUserId(null),
        onError: (err) => {
          setMutationError(getUserErrorMessage(err));
          setConfirmDisable(null);
        },
      },
    );
  };

  const handleToggleRole = useCallback((user: AdminUser) => {
    if (user.role === "admin") {
      setConfirmDemote(user);
      return;
    }
    setConfirmGrant(user);
  }, []);

  const confirmDemoteUser = () => {
    if (!confirmDemote) return;
    setMutationError(null);
    setPendingUserId(confirmDemote.id);
    updateUser(
      { userId: confirmDemote.id, body: { role: "user" } },
      {
        onSuccess: () => setConfirmDemote(null),
        onSettled: () => setPendingUserId(null),
        onError: (err) => {
          setMutationError(getUserErrorMessage(err));
          setConfirmDemote(null);
        },
      },
    );
  };

  const confirmGrantUser = () => {
    if (!confirmGrant) return;
    setMutationError(null);
    setPendingUserId(confirmGrant.id);
    updateUser(
      { userId: confirmGrant.id, body: { role: "admin" } },
      {
        onSuccess: () => setConfirmGrant(null),
        onSettled: () => setPendingUserId(null),
        onError: (err) => {
          setMutationError(getUserErrorMessage(err));
          setConfirmGrant(null);
        },
      },
    );
  };

  const users = data?.users ?? [];

  const pagination = data?.pagination ?? {
    page: 1,
    limit: PAGE_LIMIT,
    total: 0,
    totalPages: 1,
  };

  const rowProps = {
    onUpdateQuota: handleUpdateQuota,
    onToggleRole: handleToggleRole,
    onToggleDisable: handleToggleDisable,
    onViewDetail: setDetailUserId,
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

      <AdminSearchBar
        value={search}
        onChange={handleSearch}
        placeholder="Tìm theo email hoặc tên…"
        id="admin-user-search"
      />

      <div className="hidden sm:block">
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
              users.map((user) => (
                <UserTableRow
                  key={user.id}
                  user={user}
                  isSelf={currentUser?.id === user.id}
                  isRowPending={isRowPending(user.id)}
                  isSavingQuota={savingQuotaId === user.id}
                  {...rowProps}
                />
              ))}

            {!isLoading && !isError && users.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-brutal-muted">
                  Không tìm thấy người dùng.
                </td>
              </tr>
            )}
          </tbody>
        </AdminTableShell>
      </div>

      <div className="block space-y-3 sm:hidden">
        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-40 animate-pulse rounded-xl border-2 border-brutal-ink/20 bg-brutal-bg"
              />
            ))}
          </div>
        )}

        {isError && (
          <p className="py-6 text-center text-sm text-brutal-danger">
            Không tải được danh sách người dùng. Vui lòng thử lại.
          </p>
        )}

        {!isLoading &&
          !isError &&
          users.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              isSelf={currentUser?.id === user.id}
              isRowPending={isRowPending(user.id)}
              isSavingQuota={savingQuotaId === user.id}
              {...rowProps}
            />
          ))}

        {!isLoading && !isError && users.length === 0 && (
          <p className="py-10 text-center text-sm text-brutal-muted">
            Không tìm thấy người dùng.
          </p>
        )}
      </div>

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
        open={!!confirmDemote}
        title="Thu hồi quyền quản trị?"
        description={
          confirmDemote
            ? `${confirmDemote.displayName} sẽ mất quyền truy cập trang Quản trị. Thay đổi được đồng bộ với Cognito.`
            : ""
        }
        confirmLabel="Thu hồi"
        tone="danger"
        isPending={isPending}
        onConfirm={confirmDemoteUser}
        onClose={() => setConfirmDemote(null)}
      />

      <ConfirmDialog
        open={!!confirmGrant}
        title="Cấp quyền quản trị?"
        description={
          confirmGrant
            ? `${confirmGrant.displayName} sẽ có quyền truy cập trang Quản trị và quản lý người dùng, danh mục học thuật. Thay đổi được đồng bộ với Cognito.`
            : ""
        }
        confirmLabel="Cấp quyền"
        tone="default"
        isPending={isPending}
        onConfirm={confirmGrantUser}
        onClose={() => setConfirmGrant(null)}
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
