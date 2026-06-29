"use client";

import { cn } from "@/lib/cn";
import type { DriveSemesterTab } from "@/lib/drive/semester-view";
import type { DriveViewSemesterId } from "@/stores/drive-view-store";

interface DriveSemesterTabsProps {
  tabs: DriveSemesterTab[];
  activeId: DriveViewSemesterId;
  primarySemesterId: string | undefined;
  onChange: (id: DriveViewSemesterId) => void;
}

export function DriveSemesterTabs({
  tabs,
  activeId,
  primarySemesterId,
  onChange,
}: DriveSemesterTabsProps) {
  if (tabs.length <= 2) return null;

  return (
    <div
      className="mb-4 flex flex-wrap gap-2"
      role="tablist"
      aria-label="Học kỳ đang xem trên Drive"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeId;
        const isPrimary = tab.id === primarySemesterId;
        const label = tab.id === "all" ? "Tất cả" : tab.code;

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              "rounded-lg border-2 border-brutal-ink px-3 py-1.5 text-xs font-extrabold transition-all",
              isActive
                ? "bg-brutal-primary text-white shadow-brutal-sm"
                : "bg-brutal-surface text-brutal-ink hover:-translate-y-0.5 hover:shadow-brutal-sm",
            )}
          >
            {label}
            {isPrimary && tab.id !== "all" && (
              <span className="ml-1 font-semibold opacity-80">(chính)</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
