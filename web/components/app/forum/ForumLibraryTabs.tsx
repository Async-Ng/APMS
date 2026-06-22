"use client";

import { cn } from "@/lib/cn";

export type ForumLibraryTabId = "forum" | "library";

const TABS: {
  id: ForumLibraryTabId;
  label: string;
  description: string;
}[] = [
  {
    id: "forum",
    label: "Diễn đàn",
    description: "Tài liệu đồng nghiệp chia sẻ trong APMS — feed mới nhất.",
  },
  {
    id: "library",
    label: "Thư viện",
    description: "Duyệt thư viện nội bộ theo ngành, học kỳ và môn học.",
  },
];

export function ForumLibraryTabs({
  active,
  onChange,
  count,
}: {
  active: ForumLibraryTabId;
  onChange: (tab: ForumLibraryTabId) => void;
  count?: number;
}) {
  return (
    <div className="space-y-2">
      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="Chế độ xem tài liệu nội bộ"
      >
        {TABS.map((tab) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(tab.id)}
              className={cn(
                "focus-brutal inline-flex items-center gap-2 rounded-xl border-2 border-brutal-ink px-4 py-2 text-sm font-bold transition-all",
                isActive
                  ? "bg-brutal-primary text-brutal-on-brand shadow-brutal-sm"
                  : "bg-brutal-surface text-brutal-ink hover:bg-brutal-bg",
              )}
            >
              {tab.label}
              {isActive && count !== undefined && count > 0 && (
                <span className="rounded-full border-2 border-brutal-ink bg-brutal-on-brand/20 px-1.5 py-0.5 text-xs tabular-nums">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <p className="text-sm text-brutal-muted">
        {TABS.find((t) => t.id === active)?.description}
      </p>
    </div>
  );
}
