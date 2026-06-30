"use client";

import { FolderPlus, MoreHorizontal, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";

interface MobileQuickActionsMenuProps {
  onUpload: () => void;
  onNewFolder: () => void;
  uploadDisabled?: boolean;
  newFolderDisabled?: boolean;
  uploadDisabledReason?: string;
  newFolderDisabledReason?: string;
}

export function MobileQuickActionsMenu({
  onUpload,
  onNewFolder,
  uploadDisabled = false,
  newFolderDisabled = false,
  uploadDisabledReason,
  newFolderDisabledReason,
}: MobileQuickActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(e: MouseEvent | TouchEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div ref={menuRef} className="relative sm:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="focus-brutal flex h-10 w-10 items-center justify-center rounded-xl border-2 border-brutal-ink bg-brutal-bg shadow-brutal-sm transition-all hover:-translate-y-0.5 hover:shadow-brutal active:translate-y-0.5 active:shadow-[0_0_0_#1A1A1A]"
        aria-label="Thao tác nhanh"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreHorizontal className="h-5 w-5" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-[var(--z-dropdown)] mt-2 min-w-[11rem] overflow-hidden rounded-xl border-2 border-brutal-ink bg-brutal-surface shadow-brutal"
        >
          <button
            type="button"
            role="menuitem"
            disabled={uploadDisabled}
            title={uploadDisabled ? uploadDisabledReason : undefined}
            onClick={() => {
              if (uploadDisabled) return;
              setOpen(false);
              onUpload();
            }}
            className={cn(
              "focus-brutal flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-bold transition-colors hover:bg-brutal-bg",
              uploadDisabled && "cursor-not-allowed opacity-50",
            )}
          >
            <Upload className="h-4 w-4 shrink-0" aria-hidden="true" />
            Tải lên
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={newFolderDisabled}
            title={newFolderDisabled ? newFolderDisabledReason : undefined}
            onClick={() => {
              if (newFolderDisabled) return;
              setOpen(false);
              onNewFolder();
            }}
            className={cn(
              "focus-brutal flex w-full items-center gap-2 border-t-2 border-brutal-ink px-3 py-2.5 text-left text-sm font-bold transition-colors hover:bg-brutal-bg",
              newFolderDisabled && "cursor-not-allowed opacity-50",
            )}
          >
            <FolderPlus className="h-4 w-4 shrink-0" aria-hidden="true" />
            Thư mục mới
          </button>
        </div>
      )}
    </div>
  );
}
