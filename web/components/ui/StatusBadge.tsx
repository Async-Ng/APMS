import { cn } from "@/lib/cn";
import { formatElapsed, useElapsedSeconds } from "@/components/ui/useElapsedSeconds";

export type DocumentStatus = "pending" | "processing" | "ready" | "failed";

const STATUS_LABELS: Record<DocumentStatus, string> = {
  pending: "Chờ xử lý",
  processing: "Đang xử lý",
  ready: "Sẵn sàng",
  failed: "Lỗi",
};

interface BadgeProps {
  status: DocumentStatus;
  className?: string;
  /** When set and status is pending/processing, shows elapsed time since this timestamp. */
  createdAt?: string;
}

/** Document processing status badge. */
export function StatusBadge({ status, className, createdAt }: BadgeProps) {
  const isProcessing = status === "pending" || status === "processing";
  const elapsed = useElapsedSeconds(createdAt ?? new Date().toISOString());

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-semibold",
        `status-${status}`,
        className,
      )}
    >
      {status === "processing" && (
        <span
          className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-current"
          aria-hidden="true"
        />
      )}
      {STATUS_LABELS[status]}
      {createdAt && isProcessing && (
        <span className="ml-1 font-normal opacity-70">({formatElapsed(elapsed)})</span>
      )}
    </span>
  );
}
