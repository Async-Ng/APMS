"use client";

import { AlertTriangle, X } from "lucide-react";
import { useEffect, type ReactNode } from "react";

import { BrutalButton } from "@/components/ui/BrutalButton";
import { BrutalCard } from "@/components/ui/BrutalCard";
import { cn } from "@/lib/cn";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  isPending?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Xác nhận",
  cancelLabel = "Huỷ",
  tone = "default",
  isPending = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !isPending) onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, isPending, onClose]);

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
        if (e.target === e.currentTarget && !isPending) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
    >
      <BrutalCard
        className="w-full max-w-sm"
        style={{ zIndex: "var(--z-modal)" }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            {tone === "danger" && (
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-brutal-ink bg-red-50 shadow-brutal-sm"
                aria-hidden="true"
              >
                <AlertTriangle className="h-5 w-5 text-brutal-danger" />
              </div>
            )}
            <div className="min-w-0">
              <h2
                id="confirm-dialog-title"
                className="font-heading text-xl font-extrabold text-brutal-ink"
              >
                {title}
              </h2>
              <p
                id="confirm-dialog-description"
                className="mt-2 text-sm leading-relaxed text-brutal-muted"
              >
                {description}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="focus-brutal flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-brutal-ink transition-colors hover:bg-brutal-bg disabled:opacity-50"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 flex gap-2">
          <BrutalButton
            type="button"
            variant="ghost"
            className="flex-1"
            onClick={onClose}
            disabled={isPending}
          >
            {cancelLabel}
          </BrutalButton>
          <BrutalButton
            type="button"
            variant="primary"
            className={cn(
              "flex-1",
              tone === "danger" &&
                "!bg-brutal-danger hover:!bg-brutal-danger-hover",
            )}
            onClick={onConfirm}
            loading={isPending}
            disabled={isPending}
          >
            {confirmLabel}
          </BrutalButton>
        </div>
      </BrutalCard>
    </div>
  );
}
