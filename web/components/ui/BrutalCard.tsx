import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

interface BrutalCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hover?: boolean;
}

export function BrutalCard({
  children,
  className,
  hover = false,
  ...props
}: BrutalCardProps) {
  return (
    <div
      className={cn(
        "brutal-card w-full p-6 sm:p-8",
        hover && "brutal-card-hover",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
