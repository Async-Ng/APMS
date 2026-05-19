import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

interface BrutalCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export function BrutalCard({ children, className, hover = false }: BrutalCardProps) {
  return (
    <div className={cn("brutal-card w-full p-6 sm:p-8", hover && "brutal-card-hover", className)}>
      {children}
    </div>
  );
}
