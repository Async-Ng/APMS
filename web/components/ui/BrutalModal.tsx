"use client";

import { X } from "lucide-react";
import { useRef, type ReactNode } from "react";

import { BrutalCard } from "@/components/ui/BrutalCard";
import { useModalA11y } from "@/components/ui/useModalA11y";
import { cn } from "@/lib/cn";

export interface BrutalModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  preventClose?: boolean;
  showClose?: boolean;
  ariaLabelledBy?: string;
}

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
} as const;

export function BrutalModal({
  open,
  onClose,
  title,
  description,
  children,
  className,
  size = "md",
  preventClose = false,
  showClose = true,
  ariaLabelledBy,
}: BrutalModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useModalA11y(open, onClose, dialogRef, { preventClose });

  if (!open) return null;

  const titleId = ariaLabelledBy ?? (title ? "brutal-modal-title" : undefined);

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 flex items-center justify-center overflow-y-auto p-4"
      style={{
        zIndex: "var(--z-modal-overlay)",
        backgroundColor: "var(--brutal-overlay)",
        backdropFilter: "blur(2px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !preventClose) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={description ? "brutal-modal-description" : undefined}
    >
      <BrutalCard
        className={cn("w-full", sizeClasses[size], className)}
        style={{ zIndex: "var(--z-modal)" }}
      >
        {(title || showClose) && (
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              {title && (
                <h2
                  id={titleId}
                  className="font-heading text-xl font-extrabold text-brutal-ink"
                >
                  {title}
                </h2>
              )}
              {description && (
                <p
                  id="brutal-modal-description"
                  className="mt-1 text-sm text-brutal-muted"
                >
                  {description}
                </p>
              )}
            </div>
            {showClose && (
              <button
                type="button"
                onClick={onClose}
                disabled={preventClose}
                className="focus-brutal flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-brutal-ink transition-colors hover:bg-brutal-bg disabled:opacity-50"
                aria-label="Đóng"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
        {children}
      </BrutalCard>
    </div>
  );
}
