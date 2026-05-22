"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";

interface TooltipProps {
  content: string;
  children: React.ReactElement;
  side?: "top" | "bottom" | "left" | "right";
}

/**
 * Simple tooltip wrapper — shows on hover & focus, respects reduced-motion.
 * For icon-only buttons without visible labels.
 */
export function Tooltip({ content, children, side = "top" }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function show() {
    timeoutRef.current = setTimeout(() => setVisible(true), 400);
  }
  function hide() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setVisible(false);
  }

  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-1.5",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-1.5",
    left: "right-full top-1/2 -translate-y-1/2 mr-1.5",
    right: "left-full top-1/2 -translate-y-1/2 ml-1.5",
  };

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {visible && (
        <div
          role="tooltip"
          className={cn(
            "pointer-events-none absolute z-[var(--z-dropdown)] whitespace-nowrap rounded-lg border-2 border-brutal-ink bg-brutal-ink px-2.5 py-1 text-xs font-semibold text-white shadow-brutal-sm",
            positionClasses[side],
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
}
