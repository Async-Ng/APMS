"use client";

import { cn } from "@/lib/cn";

interface AdminTableShellProps {
  children: React.ReactNode;
  ariaLabel: string;
  className?: string;
}

export function AdminTableShell({
  children,
  ariaLabel,
  className,
}: AdminTableShellProps) {
  return (
    <div
      className={cn(
        "overflow-x-auto rounded-xl border-2 border-brutal-ink shadow-brutal",
        className,
      )}
    >
      <table className="min-w-full text-sm" aria-label={ariaLabel}>
        {children}
      </table>
    </div>
  );
}

export function AdminTableSkeleton({
  cols,
  rows = 5,
}: {
  cols: number;
  rows?: number;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-brutal-ink/10" aria-hidden="true">
          {Array.from({ length: cols }).map((__, j) => (
            <td key={j} className="px-4 py-3">
              <div className="skeleton h-4 w-24" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function AdminStatusBadge({
  active,
  activeLabel = "Hoạt động",
  inactiveLabel = "Đã xóa",
}: {
  active: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold",
        active ? "status-ready" : "border-brutal-muted bg-brutal-bg text-brutal-muted",
      )}
    >
      {active ? activeLabel : inactiveLabel}
    </span>
  );
}
