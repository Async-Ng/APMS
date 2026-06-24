"use client";

import { useMemo, useRef } from "react";
import { X } from "lucide-react";

import { BrutalCard } from "@/components/ui/BrutalCard";
import { useModalA11y } from "@/components/ui/useModalA11y";
import { useAdminUser } from "@/lib/queries/admin";
import { useAdminMajors, useAdminSubjects } from "@/lib/queries/admin-academic";
import { cn } from "@/lib/cn";

function formatBytes(bytes: number): string {
  if (bytes >= 1_073_741_824)
    return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(0)} MB`;
  return `${bytes} B`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface UserDetailModalProps {
  userId: string | null;
  onClose: () => void;
}

export function UserDetailModal({ userId, onClose }: UserDetailModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useModalA11y(!!userId, onClose, dialogRef);

  const { data: user, isLoading, isError } = useAdminUser(userId);
  const { data: majors } = useAdminMajors();
  const { data: subjects } = useAdminSubjects();

  const majorLabel = useMemo(() => {
    if (!user?.majorId) return null;
    const major = majors?.find((m) => m.id === user.majorId);
    return major ? `${major.code} — ${major.name}` : user.majorId;
  }, [user, majors]);

  const currentSubjects = useMemo(() => {
    if (!user?.currentSubjectIds.length) return [];
    const byId = new Map(subjects?.map((s) => [s.id, s]) ?? []);
    return user.currentSubjectIds.map((id) => {
      const subject = byId.get(id);
      return {
        id,
        label: subject ? `${subject.code} — ${subject.name}` : id,
      };
    });
  }, [user, subjects]);

  if (!userId) return null;

  const usagePercent =
    user && user.storageQuotaBytes > 0
      ? Math.min(100, Math.round((user.storageUsedBytes / user.storageQuotaBytes) * 100))
      : 0;

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{
        zIndex: "var(--z-modal-overlay)",
        backgroundColor: "var(--brutal-overlay)",
        backdropFilter: "blur(2px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-detail-title"
    >
      <BrutalCard
        className="w-full max-w-md"
        style={{ zIndex: "var(--z-modal)" }}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2
            id="user-detail-title"
            className="font-heading text-xl font-extrabold text-brutal-ink"
          >
            Chi tiết người dùng
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="focus-brutal flex h-8 w-8 items-center justify-center rounded-lg border-2 border-brutal-ink hover:bg-brutal-bg"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {isLoading && (
          <div className="space-y-3 py-4">
            <div className="skeleton h-6 w-48" />
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-3/4" />
          </div>
        )}

        {isError && (
          <p className="text-sm text-brutal-danger">
            Không tải được thông tin người dùng.
          </p>
        )}

        {user && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatarUrl}
                  alt=""
                  className="h-12 w-12 rounded-xl border-2 border-brutal-ink object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-brutal-ink bg-brutal-secondary text-lg font-bold text-white">
                  {user.displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="font-heading text-lg font-extrabold">
                  {user.displayName}
                </p>
                <p className="text-sm text-brutal-muted">{user.email}</p>
              </div>
            </div>

            <dl className="grid gap-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-brutal-muted">Vai trò</dt>
                <dd className="font-semibold">
                  {user.role === "admin" ? "Quản trị" : "Người dùng"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-brutal-muted">Trạng thái</dt>
                <dd>
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-xs font-semibold",
                      user.isDisabled ? "border-brutal-danger bg-brutal-danger/10 text-brutal-danger" : "status-ready",
                    )}
                  >
                    {user.isDisabled ? "Vô hiệu" : "Hoạt động"}
                  </span>
                </dd>
              </div>
              {majorLabel && (
                <div className="flex justify-between gap-4">
                  <dt className="text-brutal-muted">Ngành</dt>
                  <dd className="text-right font-semibold">{majorLabel}</dd>
                </div>
              )}
              {user.currentSemester && (
                <div className="flex justify-between gap-4">
                  <dt className="text-brutal-muted">Học kỳ hiện tại</dt>
                  <dd className="font-semibold">{user.currentSemester}</dd>
                </div>
              )}
              {currentSubjects.length > 0 && (
                <div className="flex flex-col gap-1">
                  <dt className="text-brutal-muted">Môn đang học</dt>
                  <dd>
                    <ul className="space-y-0.5 text-right font-semibold">
                      {currentSubjects.map(({ id, label }) => (
                        <li key={id}>{label}</li>
                      ))}
                    </ul>
                  </dd>
                </div>
              )}
              <div className="flex justify-between gap-4">
                <dt className="text-brutal-muted">Tham gia</dt>
                <dd>{formatDate(user.createdAt)}</dd>
              </div>
            </dl>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-brutal-muted">Dung lượng</span>
                <span className="font-semibold tabular-nums">
                  {formatBytes(user.storageUsedBytes)} /{" "}
                  {formatBytes(user.storageQuotaBytes)}
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full border-2 border-brutal-ink bg-brutal-bg">
                <div
                  className="h-full bg-brutal-primary transition-all"
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
              <p className="text-xs text-brutal-muted tabular-nums">
                {usagePercent}% đã sử dụng
              </p>
            </div>
          </div>
        )}
      </BrutalCard>
    </div>
  );
}
