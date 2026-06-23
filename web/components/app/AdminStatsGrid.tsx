"use client";

import {
  FileText,
  Folder,
  HardDrive,
  RefreshCw,
  Users,
  UserX,
} from "lucide-react";

import { BrutalButton } from "@/components/ui/BrutalButton";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { useAdminStats } from "@/lib/queries/admin";
import { cn } from "@/lib/cn";

function formatBytes(bytes: number): string {
  if (bytes >= 1_073_741_824)
    return `${(bytes / 1_073_741_824).toFixed(2)} GB`;
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  return `${bytes} B`;
}

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  bgClass: string;
  id: string;
}

function StatCardSkeleton() {
  return (
    <div className="brutal-card flex flex-col gap-3 p-5 bg-brutal-surface">
      <div className="skeleton h-12 w-12 rounded-xl" />
      <div className="space-y-2">
        <div className="skeleton h-3 w-24" />
        <div className="skeleton h-8 w-16" />
      </div>
    </div>
  );
}

function StatCard({ label, value, subtitle, icon, bgClass, id }: StatCardProps) {
  return (
    <div id={id} className={cn("brutal-card flex flex-col gap-3 p-5", bgClass)}>
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-brutal-ink bg-brutal-surface shadow-brutal-sm">
        {icon}
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-brutal-muted">
          {label}
        </p>
        <p className="font-heading text-3xl font-extrabold text-brutal-ink tabular-nums">
          {value}
        </p>
        {subtitle && (
          <p className="mt-1 text-xs text-brutal-muted">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

const DOC_STATUS_LABELS: Record<string, string> = {
  pending: "Chờ xử lý",
  processing: "Đang xử lý",
  ready: "Sẵn sàng",
  failed: "Lỗi",
};

/** Full stats from GET /api/admin/stats */
export function AdminStatsGrid() {
  const { data, isLoading, isError, refetch, isFetching } = useAdminStats();

  if (isError) {
    return (
      <div className="space-y-3">
        <ErrorAlert message="Không tải được thống kê. Vui lòng thử lại." />
        <BrutalButton variant="secondary" onClick={() => void refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Tải lại
        </BrutalButton>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
      </div>
    );
  }

  const avgStorage =
    data && data.totalUsers > 0
      ? formatBytes(Math.round(data.totalStorageUsedBytes / data.totalUsers))
      : null;

  const row1 = [
    {
      id: "stat-total-users",
      label: "Tổng người dùng",
      value: data?.totalUsers ?? 0,
      icon: <Users className="h-6 w-6 text-brutal-secondary" />,
      bgClass: "bg-brutal-secondary/15",
    },
    {
      id: "stat-active-users",
      label: "Đang hoạt động",
      value: data?.activeUsers ?? 0,
      icon: <Users className="h-6 w-6 text-brutal-accent" />,
      bgClass: "bg-brutal-accent/15",
    },
    {
      id: "stat-disabled-users",
      label: "Đã vô hiệu",
      value: data?.disabledUsers ?? 0,
      icon: <UserX className="h-6 w-6 text-brutal-danger" />,
      bgClass: "bg-brutal-danger/10",
    },
    {
      id: "stat-total-folders",
      label: "Tổng thư mục",
      value: data?.totalFolders ?? 0,
      icon: <Folder className="h-6 w-6 text-brutal-primary" />,
      bgClass: "bg-brutal-primary/10",
    },
  ];

  const docStatus = data?.documentsByStatus ?? {};
  const statusEntries = ["pending", "processing", "ready", "failed"] as const;

  return (
    <div className="space-y-4">
      <div
        className="grid grid-cols-2 gap-4 lg:grid-cols-4"
        role="list"
        aria-label="Thống kê hệ thống"
      >
        {row1.map((card) => (
          <StatCard key={card.id} {...card} />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="brutal-card space-y-4 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-brutal-ink bg-brutal-surface shadow-brutal-sm">
              <FileText className="h-5 w-5 text-brutal-primary" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-brutal-muted">
                Tổng tài liệu
              </p>
              <p className="font-heading text-2xl font-extrabold tabular-nums">
                {data?.totalDocuments ?? 0}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {statusEntries.map((key) => (
              <span
                key={key}
                className={cn(
                  "rounded-lg border-2 border-brutal-ink px-2.5 py-1 text-xs font-bold tabular-nums",
                  key === "ready" && "status-ready",
                  key === "failed" &&
                    "border-brutal-danger bg-brutal-danger/10 text-brutal-danger",
                  key === "processing" && "bg-brutal-accent/20",
                  key === "pending" && "bg-brutal-bg",
                )}
              >
                {DOC_STATUS_LABELS[key]}: {docStatus[key] ?? 0}
              </span>
            ))}
          </div>
        </div>

        <StatCard
          id="stat-storage"
          label="Tổng dung lượng"
          value={formatBytes(data?.totalStorageUsedBytes ?? 0)}
          subtitle={
            avgStorage ? `Trung bình ${avgStorage}/người dùng` : undefined
          }
          icon={<HardDrive className="h-6 w-6 text-brutal-muted" />}
          bgClass="bg-brutal-bg"
        />
      </div>

      {isFetching && (
        <p className="text-xs text-brutal-muted">Đang cập nhật…</p>
      )}
    </div>
  );
}
