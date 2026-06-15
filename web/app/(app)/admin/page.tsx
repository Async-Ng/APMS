"use client";

import { ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";

import { AdminStatsGrid } from "@/components/app/AdminStatsGrid";
import { Topbar } from "@/components/app/Topbar";
import { UsersTable } from "@/components/app/UsersTable";
import { useAuthStore } from "@/stores/auth-store";

export default function AdminPage() {
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);

  // Guard: redirect non-admins (covers case where middleware cookie check passes
  // but the resolved role is user)
  if (!isLoading && user && user.role !== "admin") {
    redirect("/drive");
  }

  return (
    <>
      <Topbar
        breadcrumbs={[{ label: "Quản trị" }]}
        onMenuOpen={() => {}}
      />

      <main className="flex-1 space-y-8 p-4 sm:p-6" id="main-content">
        {/* Page header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-brutal-ink bg-brutal-secondary shadow-brutal-sm">
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-extrabold text-brutal-ink">
              Quản trị
            </h1>
            <p className="text-sm text-brutal-muted">
              Thống kê hệ thống và quản lý người dùng
            </p>
          </div>
        </div>

        {/* Stats */}
        <section aria-labelledby="stats-heading">
          <h2
            id="stats-heading"
            className="mb-4 font-heading text-sm font-bold uppercase tracking-widest text-brutal-muted"
          >
            Tổng quan hệ thống
          </h2>
          <AdminStatsGrid />
        </section>

        {/* Users */}
        <section aria-labelledby="users-heading">
          <h2
            id="users-heading"
            className="mb-4 font-heading text-sm font-bold uppercase tracking-widest text-brutal-muted"
          >
            Quản lý người dùng
          </h2>
          <UsersTable />
        </section>
      </main>
    </>
  );
}
