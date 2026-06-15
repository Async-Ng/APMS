"use client";

import { Menu, Upload } from "lucide-react";

import { BreadcrumbNav, type BreadcrumbItem } from "@/components/ui/BreadcrumbNav";
import { cn } from "@/lib/cn";

interface TopbarProps {
  breadcrumbs: BreadcrumbItem[];
  onMenuOpen: () => void;
  onUploadClick?: () => void;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Sticky topbar with:
 * - Hamburger (mobile) / breadcrumb (all sizes)
 * - Optional extra action slot (e.g. New Folder button)
 * - Upload button
 */
export function Topbar({
  breadcrumbs,
  onMenuOpen,
  onUploadClick,
  actions,
  className,
}: TopbarProps) {
  return (
    <header
      className={cn(
        "sticky top-0 flex items-center gap-3 border-b-3 border-brutal-ink bg-brutal-surface px-4 py-0",
        "transition-[padding-left] duration-200",
        className,
      )}
      style={{
        height: "var(--topbar-height)",
        zIndex: "var(--z-topbar)",
      }}
    >
      {/* Mobile hamburger */}
      <button
        onClick={onMenuOpen}
        className="focus-brutal flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-brutal-ink bg-brutal-bg shadow-brutal-sm transition-all hover:-translate-y-0.5 hover:shadow-brutal active:translate-y-0.5 active:shadow-[0_0_0_#1A1A1A] lg:hidden"
        aria-label="Mở menu điều hướng"
        aria-expanded="false"
        aria-controls="sidebar"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Breadcrumb — fills remaining space */}
      <div className="flex min-w-0 flex-1">
        <BreadcrumbNav items={breadcrumbs} />
      </div>

      {/* Action area */}
      <div className="flex shrink-0 items-center gap-2">
        {actions}

        {onUploadClick && (
          <button
            id="topbar-upload-btn"
            onClick={onUploadClick}
            className="brutal-btn brutal-btn-primary focus-brutal hidden sm:inline-flex"
          >
            <Upload className="h-4 w-4" aria-hidden="true" />
            Tải lên
          </button>
        )}

        {/* Mobile upload FAB */}
        {onUploadClick && (
          <button
            onClick={onUploadClick}
            className="focus-brutal flex h-10 w-10 items-center justify-center rounded-xl border-2 border-brutal-ink bg-brutal-primary text-white shadow-brutal-sm transition-all hover:-translate-y-0.5 hover:shadow-brutal active:translate-y-0.5 active:shadow-[0_0_0_#1A1A1A] sm:hidden"
            aria-label="Tải lên tệp"
          >
            <Upload className="h-4 w-4" />
          </button>
        )}
      </div>
    </header>
  );
}
