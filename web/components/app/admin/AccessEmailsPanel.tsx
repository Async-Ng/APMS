"use client";

import { MailPlus, Pencil } from "lucide-react";
import { useCallback, useState } from "react";

import { BulkAccessEmailModal } from "@/components/app/admin/BulkAccessEmailModal";
import { AdminFormModal } from "@/components/app/admin/AdminFormModal";
import { AdminPagination } from "@/components/app/admin/AdminPagination";
import { AdminSearchBar } from "@/components/app/admin/AdminSearchBar";
import {
  AdminStatusBadge,
  AdminTableShell,
  AdminTableSkeleton,
  AdminTableTruncate,
} from "@/components/app/admin/AdminTableShell";
import { BrutalButton } from "@/components/ui/BrutalButton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { getUserErrorMessage } from "@/lib/errors";
import {
  useAccessEmails,
  useDeactivateAccessEmail,
  useUpdateAccessEmail,
  type AccessEmail,
} from "@/lib/queries/admin-access-emails";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/cn";

const PAGE_LIMIT = 10;

type StatusFilter = "all" | "active" | "inactive";

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "active", label: "Đang hoạt động" },
  { id: "inactive", label: "Đã thu hồi" },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function AccessEmailsPanel() {
  const currentEmail = useAuthStore((s) => s.user?.email?.toLowerCase());
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<AccessEmail | null>(null);
  const [editNote, setEditNote] = useState("");
  const [revokeEntry, setRevokeEntry] = useState<AccessEmail | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [pendingEmailId, setPendingEmailId] = useState<string | null>(null);

  const { data, isLoading, isError } = useAccessEmails({
    page,
    limit: PAGE_LIMIT,
    search: search || undefined,
    status: statusFilter,
  });

  const { mutate: updateEmail, isPending: isUpdating } = useUpdateAccessEmail();
  const { mutate: deactivate, isPending: isDeactivating } =
    useDeactivateAccessEmail();

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  function openEdit(entry: AccessEmail) {
    setEditEntry(entry);
    setEditNote(entry.note);
  }

  function saveNote() {
    if (!editEntry) return;
    setMutationError(null);
    updateEmail(
      { id: editEntry.id, body: { note: editNote } },
      {
        onSuccess: () => setEditEntry(null),
        onError: (err) => setMutationError(getUserErrorMessage(err)),
      },
    );
  }

  function reactivate(entry: AccessEmail) {
    setMutationError(null);
    setPendingEmailId(entry.id);
    updateEmail(
      { id: entry.id, body: { isActive: true } },
      {
        onSettled: () => setPendingEmailId(null),
        onError: (err) => setMutationError(getUserErrorMessage(err)),
      },
    );
  }

  function confirmRevoke() {
    if (!revokeEntry) return;
    setMutationError(null);
    deactivate(revokeEntry.id, {
      onSuccess: () => setRevokeEntry(null),
      onError: (err) => {
        setMutationError(getUserErrorMessage(err));
        setRevokeEntry(null);
      },
    });
  }

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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <AdminSearchBar
            value={search}
            onChange={handleSearch}
            placeholder="Tìm email hoặc ghi chú…"
            id="access-email-search"
          />
          <div className="flex flex-wrap gap-2" role="group" aria-label="Lọc trạng thái">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  setStatusFilter(f.id);
                  setPage(1);
                }}
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
        <BrutalButton variant="primary" onClick={() => setBulkOpen(true)}>
          <MailPlus className="mr-2 h-4 w-4" />
          Thêm email
        </BrutalButton>
      </div>

      <AdminTableShell ariaLabel="Bảng email truy cập">
        <thead>
          <tr className="border-b-2 border-brutal-ink bg-brutal-bg">
            <th scope="col" className="px-4 py-3 text-left font-heading font-bold">
              Email
            </th>
            <th scope="col" className="px-4 py-3 text-left font-heading font-bold">
              Ghi chú
            </th>
            <th scope="col" className="px-4 py-3 text-left font-heading font-bold">
              Trạng thái
            </th>
            <th scope="col" className="px-4 py-3 text-left font-heading font-bold">
              Ngày tạo
            </th>
            <th scope="col" className="px-4 py-3 text-left font-heading font-bold">
              Thao tác
            </th>
          </tr>
        </thead>
        <tbody>
          {isLoading && <AdminTableSkeleton cols={5} />}
          {isError && (
            <tr>
              <td colSpan={5} className="px-4 py-6 text-center text-sm text-brutal-danger">
                Không tải được danh sách email.
              </td>
            </tr>
          )}
          {!isLoading &&
            !isError &&
            data?.entries.map((entry) => {
              const isSelf = currentEmail === entry.email.toLowerCase();
              return (
                <tr
                  key={entry.id}
                  className={cn(
                    "border-b border-brutal-ink/10 hover:bg-brutal-bg",
                    !entry.isActive && "opacity-60",
                  )}
                >
                  <td className="px-4 py-3 font-medium">
                    {entry.email}
                    {isSelf && (
                      <span className="ml-1 text-xs text-brutal-muted">(bạn)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-brutal-muted">
                    <AdminTableTruncate title={entry.note || undefined}>
                      {entry.note || "—"}
                    </AdminTableTruncate>
                  </td>
                  <td className="px-4 py-3">
                    <AdminStatusBadge
                      active={entry.isActive}
                      activeLabel="Đang hoạt động"
                      inactiveLabel="Đã thu hồi"
                    />
                  </td>
                  <td className="px-4 py-3 text-brutal-muted">
                    {formatDate(entry.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <BrutalButton
                        variant="ghost"
                        className="px-2 py-1 text-xs"
                        onClick={() => openEdit(entry)}
                        aria-label={`Sửa ghi chú ${entry.email}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </BrutalButton>
                      {entry.isActive ? (
                        <BrutalButton
                          variant="ghost"
                          className="px-3 py-1 text-xs"
                          disabled={isSelf}
                          title={isSelf ? "Không thể thu hồi quyền của chính bạn" : undefined}
                          onClick={() => setRevokeEntry(entry)}
                        >
                          Thu hồi
                        </BrutalButton>
                      ) : (
                        <BrutalButton
                          variant="secondary"
                          className="px-3 py-1 text-xs"
                          onClick={() => reactivate(entry)}
                          disabled={pendingEmailId === entry.id}
                        >
                          Kích hoạt
                        </BrutalButton>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          {!isLoading && !isError && data?.entries.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-10 text-center text-sm text-brutal-muted">
                Chưa có email nào. Nhấn &quot;Thêm email&quot; để cấp quyền truy cập.
              </td>
            </tr>
          )}
        </tbody>
      </AdminTableShell>

      <AdminPagination
        pagination={pagination}
        onPageChange={setPage}
        itemLabel="email"
      />

      <BulkAccessEmailModal open={bulkOpen} onClose={() => setBulkOpen(false)} />

      <AdminFormModal
        open={!!editEntry}
        title="Sửa ghi chú"
        onClose={() => setEditEntry(null)}
        footer={
          <>
            <BrutalButton
              variant="ghost"
              className="flex-1"
              onClick={() => setEditEntry(null)}
            >
              Huỷ
            </BrutalButton>
            <BrutalButton
              variant="primary"
              className="flex-1"
              onClick={saveNote}
              loading={isUpdating}
            >
              Lưu
            </BrutalButton>
          </>
        }
      >
        <p className="text-sm font-medium">{editEntry?.email}</p>
        <textarea
          value={editNote}
          onChange={(e) => setEditNote(e.target.value)}
          rows={3}
          maxLength={500}
          className="focus-brutal w-full rounded-xl border-2 border-brutal-ink bg-brutal-surface px-3 py-2 text-sm outline-none"
          aria-label="Ghi chú"
        />
      </AdminFormModal>

      <ConfirmDialog
        open={!!revokeEntry}
        title="Thu hồi quyền truy cập?"
        description={
          revokeEntry
            ? `Email ${revokeEntry.email} sẽ không thể đăng nhập APMS ở lần yêu cầu API tiếp theo (nếu không thuộc domain được phép).`
            : ""
        }
        confirmLabel="Thu hồi"
        tone="danger"
        isPending={isDeactivating}
        onConfirm={confirmRevoke}
        onClose={() => setRevokeEntry(null)}
      />
    </div>
  );
}
