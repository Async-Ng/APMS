"use client";

import { ShieldCheck } from "lucide-react";
import { redirect, useSearchParams } from "next/navigation";

import { AccessEmailsPanel } from "@/components/app/admin/AccessEmailsPanel";
import { AcademicAdminPanel } from "@/components/app/admin/AcademicAdminPanel";
import { AdminOverviewPanel } from "@/components/app/admin/AdminOverviewPanel";
import { parseAdminTab } from "@/components/app/admin/admin-tabs";
import { UsersTable } from "@/components/app/UsersTable";
import { Topbar } from "@/components/app/Topbar";
import { useAuthStore } from "@/stores/auth-store";

export default function AdminPage() {
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const searchParams = useSearchParams();
  const activeTab = parseAdminTab(searchParams.get("tab"));

  if (!isLoading && user && user.role !== "admin") {
    redirect("/drive");
  }

  return (
    <>
      <Topbar breadcrumbs={[{ label: "Quản trị" }]} />

      <main className="admin-density flex-1 p-4 sm:p-6" id="main-content">
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

        <section
          id="panel-overview"
          aria-label="Tổng quan"
          tabIndex={0}
          hidden={activeTab !== "overview"}
          className="outline-none"
        >
          {activeTab === "overview" && <AdminOverviewPanel />}
        </section>

        <section
          id="panel-users"
          aria-label="Người dùng"
          tabIndex={0}
          hidden={activeTab !== "users"}
          className="outline-none"
        >
          {activeTab === "users" && (
            <>
              <h2
                id="users-heading"
                className="mb-4 font-heading text-sm font-bold uppercase tracking-widest text-brutal-muted"
              >
                Quản lý người dùng
              </h2>
              <UsersTable />
            </>
          )}
        </section>

        <section
          id="panel-access-emails"
          aria-label="Email truy cập"
          tabIndex={0}
          hidden={activeTab !== "access-emails"}
          className="outline-none"
        >
          {activeTab === "access-emails" && (
            <>
              <h2
                id="access-heading"
                className="mb-4 font-heading text-sm font-bold uppercase tracking-widest text-brutal-muted"
              >
                Email truy cập ngoại lệ
              </h2>
              <AccessEmailsPanel />
            </>
          )}
        </section>

        <section
          id="panel-academic"
          aria-label="Học thuật"
          tabIndex={0}
          hidden={activeTab !== "academic"}
          className="outline-none"
        >
          {activeTab === "academic" && (
            <>
              <h2
                id="academic-heading"
                className="mb-4 font-heading text-sm font-bold uppercase tracking-widest text-brutal-muted"
              >
                Danh mục học thuật
              </h2>
              <AcademicAdminPanel />
            </>
          )}
        </section>
      </main>
    </>
  );
}
