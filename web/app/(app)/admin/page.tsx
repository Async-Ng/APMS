"use client";

import { ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { useState } from "react";

import { AccessEmailsPanel } from "@/components/app/admin/AccessEmailsPanel";
import { AcademicAdminPanel } from "@/components/app/admin/AcademicAdminPanel";
import { AdminOverviewPanel } from "@/components/app/admin/AdminOverviewPanel";
import { AdminTabs, type AdminTabId } from "@/components/app/admin/AdminTabs";
import { UsersTable } from "@/components/app/UsersTable";
import { Topbar } from "@/components/app/Topbar";
import { useAdminStats } from "@/lib/queries/admin";
import { useAuthStore } from "@/stores/auth-store";

export default function AdminPage() {
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const [activeTab, setActiveTab] = useState<AdminTabId>("overview");
  const { data: stats } = useAdminStats();

  if (!isLoading && user && user.role !== "admin") {
    redirect("/drive");
  }

  const badges: Partial<Record<AdminTabId, number>> = {};
  if (stats?.totalUsers) badges.users = stats.totalUsers;

  return (
    <>
      <Topbar breadcrumbs={[{ label: "Quản trị" }]} onMenuOpen={() => {}} />

      <main className="flex-1 p-4 sm:p-6" id="main-content">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-brutal-ink bg-brutal-secondary shadow-brutal-sm">
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-extrabold text-brutal-ink">
              Quản trị
            </h1>
            <p className="text-sm text-brutal-muted">
              Thống kê, người dùng, email truy cập và danh mục học thuật
            </p>
          </div>
        </div>

        <AdminTabs active={activeTab} onChange={setActiveTab} badges={badges} />

        {activeTab === "overview" && <AdminOverviewPanel />}
        {activeTab === "users" && (
          <section aria-labelledby="users-heading">
            <h2
              id="users-heading"
              className="mb-4 font-heading text-sm font-bold uppercase tracking-widest text-brutal-muted"
            >
              Quản lý người dùng
            </h2>
            <UsersTable />
          </section>
        )}
        {activeTab === "access-emails" && (
          <section aria-labelledby="access-heading">
            <h2
              id="access-heading"
              className="mb-4 font-heading text-sm font-bold uppercase tracking-widest text-brutal-muted"
            >
              Email truy cập ngoại lệ
            </h2>
            <AccessEmailsPanel />
          </section>
        )}
        {activeTab === "academic" && (
          <section aria-labelledby="academic-heading">
            <h2
              id="academic-heading"
              className="mb-4 font-heading text-sm font-bold uppercase tracking-widest text-brutal-muted"
            >
              Danh mục học thuật
            </h2>
            <AcademicAdminPanel />
          </section>
        )}
      </main>
    </>
  );
}
