"use client";

import { cn } from "@/lib/cn";
import { useTabArrowNav } from "@/components/ui/useTabArrowNav";

export interface BrutalTabItem<T extends string> {
  id: T;
  label: string;
  description?: string;
  count?: number;
}

interface BrutalTabsProps<T extends string> {
  tabs: BrutalTabItem<T>[];
  active: T;
  onChange: (id: T) => void;
  ariaLabel: string;
  className?: string;
  size?: "sm" | "md";
}

export function BrutalTabs<T extends string>({
  tabs,
  active,
  onChange,
  ariaLabel,
  className,
  size = "md",
}: BrutalTabsProps<T>) {
  const tabIds = tabs.map((t) => t.id);
  const handleKeyDown = useTabArrowNav(tabIds, onChange);
  const activeTab = tabs.find((t) => t.id === active);
  const isSm = size === "sm";

  return (
    <div className={cn("space-y-2", className)}>
      <div
        className="flex w-fit flex-wrap items-center gap-2"
        role="tablist"
        aria-label={ariaLabel}
      >
        {tabs.map((tab) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onChange(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, tab.id)}
              className={cn(
                "focus-brutal inline-flex shrink-0 items-center gap-1.5 rounded-xl border-2 border-brutal-ink font-bold transition-all",
                isSm ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm",
                isActive
                  ? "bg-brutal-primary text-brutal-on-brand shadow-brutal-sm"
                  : "bg-brutal-surface text-brutal-ink hover:bg-brutal-bg",
              )}
            >
              {tab.label}
              {isActive && tab.count !== undefined && (
                <span
                  className={cn(
                    "rounded-full border-2 border-brutal-ink bg-brutal-on-brand/20 tabular-nums",
                    isSm ? "px-1 py-0 text-[10px] leading-tight" : "px-1.5 py-0.5 text-xs",
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {activeTab?.description && (
        <p className="text-sm text-brutal-muted">{activeTab.description}</p>
      )}
    </div>
  );
}
