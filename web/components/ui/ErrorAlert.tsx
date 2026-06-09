import { AlertCircle } from "lucide-react";

import { cn } from "@/lib/cn";

interface ErrorAlertProps {
  message: string;
  className?: string;
  variant?: "inline" | "banner";
  actionLabel?: string;
  onAction?: () => void;
}

export function ErrorAlert({
  message,
  className,
  variant = "banner",
  actionLabel,
  onAction,
}: ErrorAlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-3 rounded-xl border-2 border-brutal-ink bg-red-50 px-4 py-3 text-sm font-medium text-brutal-danger",
        variant === "inline" && "text-xs",
        className,
      )}
    >
      <AlertCircle
        className={cn("shrink-0", variant === "inline" ? "h-4 w-4" : "h-5 w-5")}
        strokeWidth={2}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p>{message}</p>
        {actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="focus-brutal mt-2 rounded-lg border-2 border-brutal-ink bg-brutal-surface px-3 py-1 text-xs font-bold text-brutal-ink hover:bg-brutal-bg"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
