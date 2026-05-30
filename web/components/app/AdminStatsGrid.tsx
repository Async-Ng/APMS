"use client";

import { FileText, HardDrive, Users } from "lucide-react";

import { useAdminStats } from "@/lib/queries/admin";

function formatBytes(bytes: number): string {
  if (bytes >= 1_073_741_824)
    return `${(bytes / 1_073_741_824).toFixed(2)} GB`;
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  return `${bytes} B`;
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  bgColor: string;
  id: string;
}

function StatCard({ label, value, icon, bgColor, id }: StatCardProps) {
  return (
    <div
      id={id}
      className="brutal-card flex flex-col gap-3 p-5"
      style={{ backgroundColor: bgColor }}
    >
      <div className="flex items-start justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-brutal-ink bg-white shadow-brutal-sm">
          {icon}
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-brutal-muted">
          {label}
        </p>
        <p className="font-heading text-3xl font-extrabold text-brutal-ink tabular-nums">
          {value}
        </p>
      </div>
    </div>
  );
}

/** 4-card stats grid — fetches /api/admin/stats */
export function AdminStatsGrid() {
  const { data, isLoading, isError } = useAdminStats();

  if (isError) {
    return (
      <p className="rounded-xl border-2 border-brutal-ink bg-red-50 px-4 py-3 text-sm font-medium text-brutal-danger">
        Failed to load statistics.
      </p>
    );
  }

  const cards = [
    {
      id: "stat-total-users",
      label: "Total Users",
      value: isLoading ? "—" : data?.totalUsers ?? 0,
      icon: <Users className="h-6 w-6 text-brutal-secondary" />,
      bgColor: "#dbeafe",
    },
    {
      id: "stat-active-users",
      label: "Active Users",
      value: isLoading ? "—" : data?.activeUsers ?? 0,
      icon: <Users className="h-6 w-6 text-brutal-accent" />,
      bgColor: "#dcfce7",
    },
    {
      id: "stat-total-docs",
      label: "Total Documents",
      value: isLoading ? "—" : data?.totalDocuments ?? 0,
      icon: <FileText className="h-6 w-6 text-brutal-primary" />,
      bgColor: "#fff7ed",
    },
    {
      id: "stat-storage",
      label: "Total Storage",
      value: isLoading ? "—" : formatBytes(data?.totalStorageUsedBytes ?? 0),
      icon: <HardDrive className="h-6 w-6 text-brutal-muted" />,
      bgColor: "#f8fafc",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" role="list" aria-label="System statistics">
      {cards.map((card) => (
        <StatCard key={card.id} {...card} />
      ))}
    </div>
  );
}
