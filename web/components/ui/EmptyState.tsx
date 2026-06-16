import { FolderOpen } from "lucide-react";

import { cn } from "@/lib/cn";

interface EmptyStateProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title = "Chưa có gì ở đây",
  description = "Tải lên tệp hoặc tạo thư mục để bắt đầu.",
  action,
  icon,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 py-20 text-center",
        className,
      )}
    >
      {/* Illustrated icon blob */}
      <div
        className="flex h-24 w-24 items-center justify-center rounded-2xl border-3 border-brutal-ink bg-brutal-surface shadow-brutal"
        aria-hidden="true"
      >
        {icon ?? (
          <FolderOpen className="h-12 w-12 text-brutal-primary" strokeWidth={1.5} />
        )}
      </div>

      <div className="space-y-1">
        <p className="font-heading text-xl font-extrabold text-brutal-ink">
          {title}
        </p>
        <p className="max-w-xs text-sm text-brutal-muted">{description}</p>
      </div>

      {action && <div>{action}</div>}
    </div>
  );
}
