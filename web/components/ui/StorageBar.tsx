import { HardDrive } from "lucide-react";

import { cn } from "@/lib/cn";

interface StorageBarProps {
  usedBytes: number;
  quotaBytes: number;
  className?: string;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  if (bytes >= 1_024) return `${(bytes / 1_024).toFixed(0)} KB`;
  return `${bytes} B`;
}

/** Storage quota progress bar for the sidebar. */
export function StorageBar({
  usedBytes,
  quotaBytes,
  className,
}: StorageBarProps) {
  const pct = quotaBytes > 0 ? Math.min((usedBytes / quotaBytes) * 100, 100) : 0;
  const isWarning = pct >= 80;
  const isFull = pct >= 95;

  return (
    <div className={cn("space-y-1.5 px-3", className)}>
      <div className="flex items-center gap-1.5">
        <HardDrive
          className="h-3.5 w-3.5 shrink-0 text-brutal-muted"
          aria-hidden="true"
        />
        <span className="truncate text-xs text-brutal-muted">
          {formatBytes(usedBytes)} / {formatBytes(quotaBytes)}
        </span>
      </div>

      {/* Track */}
      <div
        className="h-2 w-full overflow-hidden rounded-full border-2 border-brutal-ink bg-brutal-bg"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Dung lượng: đã dùng ${formatBytes(usedBytes)} / ${formatBytes(quotaBytes)}`}
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-500",
            isFull
              ? "bg-brutal-danger"
              : isWarning
                ? "bg-brutal-primary"
                : "bg-brutal-accent",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
