import { ChevronRight, HardDrive } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/cn";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbNavProps {
  items: BreadcrumbItem[];
  className?: string;
  showRootIcon?: boolean;
}

/** Neo-brutalism breadcrumb for folder navigation depth ≥ 2. */
export function BreadcrumbNav({
  items,
  className,
  showRootIcon = true,
}: BreadcrumbNavProps) {
  return (
    <nav
      aria-label="Đường dẫn"
      className={cn("flex min-w-0 items-center", className)}
    >
      <ol className="flex min-w-0 items-center gap-1 text-sm font-medium">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={index} className="flex min-w-0 items-center gap-1">
              {index === 0 && showRootIcon && (
                <HardDrive
                  className="mr-0.5 h-3.5 w-3.5 shrink-0 text-brutal-muted"
                  aria-hidden="true"
                />
              )}
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="focus-brutal max-w-[120px] truncate rounded px-1 py-0.5 text-brutal-muted transition-colors hover:text-brutal-ink"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className="max-w-[140px] truncate px-1 py-0.5 font-bold text-brutal-ink"
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}
              {!isLast && (
                <ChevronRight
                  className="h-3.5 w-3.5 shrink-0 text-brutal-muted"
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
