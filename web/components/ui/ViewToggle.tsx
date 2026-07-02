"use client";

import { LayoutGrid, List } from "lucide-react";

import { BrutalButton } from "@/components/ui/BrutalButton";
import { cn } from "@/lib/cn";

export type ViewMode = "grid" | "list";

interface ViewToggleProps {
  view: ViewMode;
  onChange: (view: ViewMode) => void;
  className?: string;
}

export function ViewToggle({ view, onChange, className }: ViewToggleProps) {
  return (
    <div className={cn("flex items-center justify-end gap-2", className)}>
      <BrutalButton
        variant={view === "grid" ? "secondary" : "ghost"}
        size="sm"
        className="px-2 py-1"
        onClick={() => onChange("grid")}
        aria-label="Xem dạng lưới"
        aria-pressed={view === "grid"}
      >
        <LayoutGrid className="h-4 w-4" />
      </BrutalButton>
      <BrutalButton
        variant={view === "list" ? "secondary" : "ghost"}
        size="sm"
        className="px-2 py-1"
        onClick={() => onChange("list")}
        aria-label="Xem dạng danh sách"
        aria-pressed={view === "list"}
      >
        <List className="h-4 w-4" />
      </BrutalButton>
    </div>
  );
}
