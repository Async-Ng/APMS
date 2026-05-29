import { cn } from "@/lib/cn";

interface FileGridProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Responsive grid container for FolderCard + DocumentCard items.
 * 2 cols on mobile → 3 on sm → 4 on lg → 5 on xl
 */
export function FileGrid({ children, className }: FileGridProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
        className,
      )}
    >
      {children}
    </div>
  );
}
