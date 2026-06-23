"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

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
  anchorRef: RefObject<HTMLElement | null>;
  className?: string;
}

type MenuPosition = {
  top?: number;
  bottom?: number;
  right: number;
  minWidth: number;
};

const MENU_GAP = 4;
const MENU_MIN_WIDTH = 160;
const ITEM_HEIGHT_ESTIMATE = 44;

function computePosition(
  anchor: HTMLElement,
  menuHeight: number,
): MenuPosition {
  const rect = anchor.getBoundingClientRect();
  const right = Math.max(8, window.innerWidth - rect.right);

  const spaceBelow = window.innerHeight - rect.bottom - MENU_GAP;
  const spaceAbove = rect.top - MENU_GAP;
  const openBelow = spaceBelow >= menuHeight || spaceBelow >= spaceAbove;

  if (openBelow) {
    return {
      top: rect.bottom + MENU_GAP,
      right,
      minWidth: MENU_MIN_WIDTH,
    };
  }

  return {
    bottom: window.innerHeight - rect.top + MENU_GAP,
    right,
    minWidth: MENU_MIN_WIDTH,
  };
}

/**
 * Dropdown context menu — portaled to document.body with fixed positioning.
 * Closes on outside click or Escape. Flips above trigger when space is tight.
 */
export function ContextMenu({
  items,
  onClose,
  anchorRef,
  className,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<MenuPosition | null>(null);

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;

    const menuHeight =
      menuRef.current?.offsetHeight ??
      items.length * ITEM_HEIGHT_ESTIMATE;

    setPosition(computePosition(anchor, menuHeight));
  }, [anchorRef, items.length]);

  useLayoutEffect(() => {
    updatePosition();
    const frameId = requestAnimationFrame(() => updatePosition());
    return () => cancelAnimationFrame(frameId);
  }, [updatePosition]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        menuRef.current?.contains(target) ||
        anchorRef.current?.contains(target)
      ) {
        return;
      }
      onClose();
    }

    function handleScrollOrResize() {
      updatePosition();
    }

    document.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handleClick);
    window.addEventListener("resize", handleScrollOrResize);
    window.addEventListener("scroll", handleScrollOrResize, {
      capture: true,
      passive: true,
    });

    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("mousedown", handleClick);
      window.removeEventListener("resize", handleScrollOrResize);
      window.removeEventListener("scroll", handleScrollOrResize, {
        capture: true,
      });
    };
  }, [onClose, anchorRef, updatePosition]);

  const menuStyle: React.CSSProperties = {
    position: "fixed",
    zIndex: "var(--z-dropdown)",
    minWidth: position?.minWidth ?? MENU_MIN_WIDTH,
    right: position?.right ?? 8,
    ...(position?.top !== undefined ? { top: position.top } : {}),
    ...(position?.bottom !== undefined ? { bottom: position.bottom } : {}),
  };

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      aria-orientation="vertical"
      className={cn(
        "min-w-[160px] overflow-hidden rounded-xl border-2 border-brutal-ink bg-brutal-surface shadow-brutal",
        className,
      )}
      style={menuStyle}
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
            <span
              className="flex h-4 w-4 shrink-0 items-center justify-center"
              aria-hidden="true"
            >
              {item.icon}
            </span>
          )}
          {item.label}
        </button>
      ))}
    </div>,
    document.body,
  );
}
