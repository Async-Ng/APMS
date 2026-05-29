import { cn } from "@/lib/cn";

interface SkeletonCardProps {
  className?: string;
  rows?: number;
}

/** Shimmer skeleton for loading states — renders n placeholder rows */
export function SkeletonCard({ className, rows = 1 }: SkeletonCardProps) {
  return (
    <div
      className={cn(
        "brutal-card animate-pulse space-y-3 p-4",
        className,
      )}
      aria-hidden="true"
    >
      <div className="skeleton h-10 w-10 rounded-xl" />
      <div className="skeleton h-4 w-3/4" />
      {Array.from({ length: rows - 1 }).map((_, i) => (
        <div key={i} className="skeleton h-3 w-1/2" />
      ))}
    </div>
  );
}

/** Shimmer skeleton for grid loading — renders n placeholder cards */
export function SkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} rows={2} />
      ))}
    </>
  );
}
