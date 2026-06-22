"use client";

import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";

import { BrutalCard } from "@/components/ui/BrutalCard";

interface AdminFormModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: "sm" | "md" | "lg";
}

const MAX_WIDTH = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
} as const;

export function AdminFormModal({
  open,
  title,
  onClose,
  children,
  footer,
  maxWidth = "md",
}: AdminFormModalProps) {
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{
        zIndex: "var(--z-modal-overlay)",
        backgroundColor: "rgba(26,26,26,0.5)",
        backdropFilter: "blur(2px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-form-modal-title"
    >
      <BrutalCard
        className={`w-full ${MAX_WIDTH[maxWidth]}`}
        style={{ zIndex: "var(--z-modal)" }}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2
            id="admin-form-modal-title"
            className="font-heading text-xl font-extrabold text-brutal-ink"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="focus-brutal flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-brutal-ink transition-colors hover:bg-brutal-bg"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4">{children}</div>
        {footer && <div className="mt-5 flex gap-2">{footer}</div>}
      </BrutalCard>
    </div>
  );
}
