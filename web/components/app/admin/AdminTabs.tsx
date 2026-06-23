"use client";

import { useTabArrowNav } from "@/components/ui/useTabArrowNav";
import { cn } from "@/lib/cn";

export type AdminTabId = "overview" | "users" | "access-emails" | "academic";

const TAB_IDS: AdminTabId[] = ["overview", "users", "access-emails", "academic"];

const TABS: {
  id: AdminTabId;
  label: string;
  description: string;
}[] = [
  {
    id: "overview",
    label: "Tổng quan",
    description: "Thống kê hệ thống",
  },
  {
    id: "users",
    label: "Người dùng",
    description: "Quản lý tài khoản",
  },
  {
    id: "access-emails",
    label: "Email truy cập",
    description: "Ngoại lệ domain",
  },
  {
    id: "academic",
    label: "Học thuật",
    description: "Ngành, môn, CTĐT",
  },
];

export function AdminTabs({
  active,
  onChange,
  badges,
}: {
  active: AdminTabId;
  onChange: (tab: AdminTabId) => void;
  badges?: Partial<Record<AdminTabId, number>>;
}) {
  const handleKeyDown = useTabArrowNav(TAB_IDS, onChange);

  return (
    <div
      className="sticky top-0 z-10 -mx-4 mb-6 border-b-2 border-brutal-ink/10 bg-brutal-bg/95 px-4 py-3 backdrop-blur-sm sm:-mx-6 sm:px-6"
      role="tablist"
      aria-label="Khu vực quản trị"
    >
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const count = badges?.[tab.id];
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onChange(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, tab.id)}
              className={cn(
                "focus-brutal inline-flex items-center gap-2 rounded-xl border-2 border-brutal-ink px-4 py-2 text-sm font-bold transition-all",
                isActive
                  ? "bg-brutal-primary text-brutal-on-brand shadow-brutal-sm"
                  : "bg-brutal-surface text-brutal-ink hover:bg-brutal-bg",
              )}
            >
              <span>{tab.label}</span>
              {count !== undefined && count > 0 && (
                <span
                  className={cn(
                    "rounded-full border-2 border-brutal-ink px-1.5 py-0.5 text-xs tabular-nums",
                    isActive ? "bg-brutal-on-brand/20" : "bg-brutal-bg",
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-brutal-muted">
        {TABS.find((t) => t.id === active)?.description}
      </p>
    </div>
  );
}
