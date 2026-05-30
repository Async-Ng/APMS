"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/cn";

export interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

interface ContextMenuProps {
  items: ContextMenuItem[];
  onClose: () => void;
  className?: string;
}

/**
 * Dropdown context menu — closes on outside click or Escape.
 * Positioned absolute relative to the trigger button's parent.
 */
export function ContextMenu({ items, onClose, className }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-orientation="vertical"
      className={cn(
        "absolute right-0 top-full mt-1 min-w-[160px] overflow-hidden rounded-xl border-2 border-brutal-ink bg-brutal-surface shadow-brutal",
        className,
      )}
      style={{ zIndex: "var(--z-dropdown)" }}
    >
      {items.map((item, idx) => (
        <button
          key={idx}
          role="menuitem"
          disabled={item.disabled}
          onClick={() => {
            item.onClick();
            onClose();
          }}
          className={cn(
            "focus-brutal flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm font-medium transition-colors",
            item.danger
              ? "text-brutal-danger hover:bg-red-50"
              : "text-brutal-ink hover:bg-brutal-bg",
            item.disabled && "cursor-not-allowed opacity-50",
          )}
        >
          {item.icon && (
            <span className="flex h-4 w-4 shrink-0 items-center justify-center" aria-hidden="true">
              {item.icon}
            </span>
          )}
          {item.label}
        </button>
      ))}
    </div>
  );
}
