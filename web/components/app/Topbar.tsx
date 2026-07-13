"use client";

import Link from "next/link";
import { Menu, Search, Upload } from "lucide-react";

import { useAppShell } from "@/components/app/AppShellContext";
import { BreadcrumbNav, type BreadcrumbItem } from "@/components/ui/BreadcrumbNav";
import { BrutalButton } from "@/components/ui/BrutalButton";
import { cn } from "@/lib/cn";

interface TopbarProps {
  breadcrumbs: BreadcrumbItem[];
  onUploadClick?: () => void;
  suppressMobileUpload?: boolean;
  actions?: React.ReactNode;
  className?: string;
  showBreadcrumbRootIcon?: boolean;
  showSearch?: boolean;
}

/**
 * Sticky topbar with hamburger (mobile), breadcrumb, global search, and upload.
 */
export function Topbar({
  breadcrumbs,
  onUploadClick,
  suppressMobileUpload = false,
  actions,
  className,
  showBreadcrumbRootIcon = true,
  showSearch = true,
}: TopbarProps) {
  const { openMobileMenu, isMobileOpen } = useAppShell();

  return (
    <header
      className={cn(
        "sticky top-0 flex shrink-0 items-center gap-2 border-b-2 border-brutal-ink bg-brutal-surface px-3 py-0 sm:gap-3 sm:px-4",
        className,
      )}
      style={{
        height: "var(--topbar-height)",
        zIndex: "var(--z-topbar)",
      }}
    >
      <button
        onClick={openMobileMenu}
        className="focus-brutal flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-brutal-ink bg-brutal-bg shadow-brutal-sm transition-all hover:-translate-y-0.5 hover:shadow-brutal active:translate-y-0.5 active:shadow-[0_0_0_#1A1A1A] lg:hidden"
        aria-label="Mở menu điều hướng"
        aria-expanded={isMobileOpen}
        aria-controls="sidebar"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex min-w-0 flex-1 items-center gap-2">
        <BreadcrumbNav items={breadcrumbs} showRootIcon={showBreadcrumbRootIcon} />
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {showSearch && (
          <Link
            href="/search"
            className="focus-brutal hidden items-center gap-2 rounded-xl border-2 border-brutal-ink bg-brutal-bg px-3 py-2 text-sm font-medium text-brutal-muted shadow-brutal-sm transition-colors hover:bg-brutal-surface hover:text-brutal-ink md:inline-flex"
            aria-label="Tìm kiếm tài liệu"
          >
            <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="max-w-[12rem] truncate">Tìm tài liệu…</span>
          </Link>
        )}

        {showSearch && (
          <Link
            href="/search"
            className="focus-brutal flex h-10 w-10 items-center justify-center rounded-xl border-2 border-brutal-ink bg-brutal-bg shadow-brutal-sm transition-all hover:-translate-y-0.5 hover:shadow-brutal md:hidden"
            aria-label="Tìm kiếm tài liệu"
          >
            <Search className="h-4 w-4" />
          </Link>
        )}

        {actions}

        {onUploadClick && (
          <BrutalButton
            id="topbar-upload-btn"
            variant="primary"
            onClick={onUploadClick}
            className="hidden w-auto! shrink-0 whitespace-nowrap sm:inline-flex"
          >
            <Upload className="h-4 w-4" aria-hidden="true" />
            Tải lên
          </BrutalButton>
        )}

        {onUploadClick && !suppressMobileUpload && (
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
