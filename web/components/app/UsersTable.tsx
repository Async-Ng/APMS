"use client";

import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useCallback, useState } from "react";

import { BrutalButton } from "@/components/ui/BrutalButton";
import type { AdminUser } from "@/lib/queries/admin";
import { useAdminUsers, useUpdateAdminUser } from "@/lib/queries/admin";
import { cn } from "@/lib/cn";

const PAGE_LIMIT = 10;

function formatBytes(bytes: number): string {
  if (bytes >= 1_073_741_824)
    return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(0)} MB`;
  return `${bytes} B`;
}

/* ── Edit quota inline input ─────────────────────────────────── */

function QuotaCell({
  user,
  onUpdate,
}: {
  user: AdminUser;
  onUpdate: (userId: string, quota: number) => void;
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
        className="focus-brutal rounded px-2 py-1 text-sm tabular-nums underline-offset-2 hover:underline"
        title="Click to edit quota"
      >
        {formatBytes(user.storageQuotaBytes)}
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
        aria-label="Storage quota in MB"
        autoFocus
        min="1"
      />
      <span className="text-xs text-brutal-muted">MB</span>
    </div>
  );
}

/* ── Users table ─────────────────────────────────────────────── */

export function UsersTable() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search
  const [searchTimer, setSearchTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  function handleSearch(value: string) {
    setSearch(value);
    if (searchTimer) clearTimeout(searchTimer);
    const t = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 300);
    setSearchTimer(t);
  }

  const { data, isLoading, isError } = useAdminUsers({
    page,
    limit: PAGE_LIMIT,
    search: debouncedSearch || undefined,
  });

  const { mutate: updateUser } = useUpdateAdminUser();

  const handleUpdateQuota = useCallback(
    (userId: string, quotaBytes: number) => {
      updateUser({ userId, body: { storageQuotaBytes: quotaBytes } });
    },
    [updateUser],
  );

  const handleToggleDisable = useCallback(
    (user: AdminUser) => {
      updateUser({
        userId: user.id,
        body: { isDisabled: !user.isDisabled },
      });
    },
    [updateUser],
  );

  const totalPages = data ? Math.ceil(data.total / PAGE_LIMIT) : 1;

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative max-w-sm">
        <Search
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brutal-muted"
          aria-hidden="true"
        />
        <input
          id="admin-user-search"
          type="search"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search by email or name…"
          className="focus-brutal w-full rounded-xl border-2 border-brutal-ink bg-brutal-surface py-2.5 pl-9 pr-4 text-sm outline-none shadow-brutal-sm"
          aria-label="Search users"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border-2 border-brutal-ink shadow-brutal">
        <table className="min-w-full text-sm" aria-label="User management table">
          <thead>
            <tr className="border-b-2 border-brutal-ink bg-brutal-bg">
              <th scope="col" className="px-4 py-3 text-left font-heading font-bold">
                User
              </th>
              <th scope="col" className="px-4 py-3 text-left font-heading font-bold">
                Role
              </th>
              <th scope="col" className="px-4 py-3 text-left font-heading font-bold">
                Storage Used
              </th>
              <th scope="col" className="px-4 py-3 text-left font-heading font-bold">
                Quota
              </th>
              <th scope="col" className="px-4 py-3 text-left font-heading font-bold">
                Status
              </th>
              <th scope="col" className="px-4 py-3 text-left font-heading font-bold">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <tr
                  key={i}
                  className="border-b border-brutal-ink/10"
                  aria-hidden="true"
                >
                  {Array.from({ length: 6 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="skeleton h-4 w-24" />
                    </td>
                  ))}
                </tr>
              ))}

            {isError && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-6 text-center text-sm text-brutal-danger"
                >
                  Không tải được danh sách người dùng. Vui lòng thử lại.
                </td>
              </tr>
            )}

            {!isLoading &&
              !isError &&
              data?.users.map((user) => (
                <tr
                  key={user.id}
                  className={cn(
                    "border-b border-brutal-ink/10 transition-colors hover:bg-brutal-bg",
                    user.isDisabled && "opacity-60",
                  )}
                >
                  {/* User */}
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
                        </p>
                        <p className="truncate text-xs text-brutal-muted">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Role */}
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold",
                        user.role === "admin"
                          ? "border-brutal-secondary bg-blue-50 text-brutal-secondary"
                          : "border-brutal-ink/20 bg-brutal-bg text-brutal-muted",
                      )}
                    >
                      {user.role}
                    </span>
                  </td>

                  {/* Storage used */}
                  <td className="px-4 py-3 tabular-nums text-brutal-muted">
                    {formatBytes(user.storageUsedBytes)}
                  </td>

                  {/* Quota — editable */}
                  <td className="px-4 py-3">
                    <QuotaCell user={user} onUpdate={handleUpdateQuota} />
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold",
                        user.isDisabled
                          ? "border-brutal-danger bg-red-50 text-brutal-danger"
                          : "status-ready",
                      )}
                    >
                      {user.isDisabled ? "Disabled" : "Active"}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <BrutalButton
                      variant={user.isDisabled ? "secondary" : "ghost"}
                      onClick={() => handleToggleDisable(user)}
                      className="px-3 py-1 text-xs"
                      aria-label={
                        user.isDisabled
                          ? `Enable ${user.displayName}`
                          : `Disable ${user.displayName}`
                      }
                    >
                      {user.isDisabled ? "Enable" : "Disable"}
                    </BrutalButton>
                  </td>
                </tr>
              ))}

            {!isLoading && !isError && data?.users.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-sm text-brutal-muted"
                >
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-brutal-muted">
            Page {page} of {totalPages}
            {data && (
              <span> — {data.total} users total</span>
            )}
          </p>
          <div className="flex gap-2">
            <BrutalButton
              variant="ghost"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              aria-label="Previous page"
              className="px-2"
            >
              <ChevronLeft className="h-4 w-4" />
            </BrutalButton>
            <BrutalButton
              variant="ghost"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              aria-label="Next page"
              className="px-2"
            >
              <ChevronRight className="h-4 w-4" />
            </BrutalButton>
          </div>
        </div>
      )}
    </div>
  );
}
