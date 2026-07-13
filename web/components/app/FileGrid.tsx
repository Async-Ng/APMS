import { cn } from "@/lib/cn";

interface FileGridProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Responsive grid container for FolderCard + DocumentCard items.
 * Auto-fill keeps card width sensible on wide viewports.
 */
export function FileGrid({ children, className }: FileGridProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-3",
        className,
      )}
    >
      {children}
    </div>
  );
}
