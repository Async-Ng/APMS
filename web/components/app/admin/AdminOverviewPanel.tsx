"use client";

import { AdminStatsGrid } from "@/components/app/AdminStatsGrid";

export function AdminOverviewPanel() {
  return (
    <section aria-labelledby="stats-heading">
      <h2
        id="stats-heading"
        className="mb-4 font-heading text-sm font-bold uppercase tracking-widest text-brutal-muted"
      >
        Tổng quan hệ thống
      </h2>
      <AdminStatsGrid />
    </section>
  );
}
