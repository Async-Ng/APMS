import { cn } from "@/lib/cn";

export type DocumentStatus = "pending" | "processing" | "ready" | "failed";

const STATUS_LABELS: Record<DocumentStatus, string> = {
  pending: "Pending",
  processing: "Processing",
  ready: "Ready",
  failed: "Failed",
};

interface BadgeProps {
  status: DocumentStatus;
  className?: string;
}

/** Document processing status badge. */
export function StatusBadge({ status, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold",
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
    </span>
  );
}
