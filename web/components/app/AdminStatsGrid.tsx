"use client";

import {
  FileText,
  Folder,
  HardDrive,
  MessageSquare,
  RefreshCw,
  Users,
  UserX,
} from "lucide-react";

import { AdminOverviewCharts } from "@/components/app/admin/AdminOverviewCharts";
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

function ChartSkeleton() {
  return <div className="brutal-card skeleton min-h-[280px] w-full" />;
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

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartSkeleton />
          <ChartSkeleton />
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
        <ChartSkeleton />
      </div>
    );
  }

  const avgStorage =
    data.totalUsers > 0
      ? formatBytes(Math.round(data.totalStorageUsedBytes / data.totalUsers))
      : null;

  const kpiCards: StatCardProps[] = [
    {
      id: "stat-total-users",
      label: "Tổng người dùng",
      value: data.totalUsers,
      icon: <Users className="h-6 w-6 text-brutal-secondary" />,
      bgClass: "bg-brutal-secondary/15",
    },
    {
      id: "stat-active-users",
      label: "Đang hoạt động",
      value: data.activeUsers,
      icon: <Users className="h-6 w-6 text-brutal-accent" />,
      bgClass: "bg-brutal-accent/15",
    },
    {
      id: "stat-disabled-users",
      label: "Đã vô hiệu",
      value: data.disabledUsers,
      icon: <UserX className="h-6 w-6 text-brutal-danger" />,
      bgClass: "bg-brutal-danger/10",
    },
    {
      id: "stat-total-folders",
      label: "Tổng thư mục",
      value: data.totalFolders,
      icon: <Folder className="h-6 w-6 text-brutal-primary" />,
      bgClass: "bg-brutal-primary/10",
    },
    {
      id: "stat-total-documents",
      label: "Tổng tài liệu",
      value: data.totalDocuments,
      subtitle: `Sẵn sàng ${data.documentsByStatus.ready} · Lỗi ${data.documentsByStatus.failed}`,
      icon: <FileText className="h-6 w-6 text-brutal-primary" />,
      bgClass: "bg-brutal-primary/10",
    },
    {
      id: "stat-storage",
      label: "Tổng dung lượng",
      value: formatBytes(data.totalStorageUsedBytes),
      subtitle: avgStorage ? `Trung bình ${avgStorage}/người dùng` : undefined,
      icon: <HardDrive className="h-6 w-6 text-brutal-muted" />,
      bgClass: "bg-brutal-bg",
    },
    {
      id: "stat-ai-today",
      label: "AI hôm nay (UTC)",
      value: data.aiTurnsToday,
      subtitle: `${data.aiDistinctUsersToday} người dùng đã chat`,
      icon: <MessageSquare className="h-6 w-6 text-brutal-secondary" />,
      bgClass: "bg-brutal-secondary/15",
    },
  ];

  return (
    <div className="space-y-6">
      <div
        className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4"
        role="list"
        aria-label="Chỉ số tổng quan"
      >
        {kpiCards.map((card) => (
          <StatCard key={card.id} {...card} />
        ))}
      </div>

      <AdminOverviewCharts data={data} />

      {isFetching && (
        <p className="text-xs text-brutal-muted">Đang cập nhật…</p>
      )}
    </div>
  );
}
