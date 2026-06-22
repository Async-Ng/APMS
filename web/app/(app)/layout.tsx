"use client";

import "@/lib/amplify";
import { useEffect, useState } from "react";

import { RequireAuth } from "@/components/app/RequireAuth";
import { Sidebar } from "@/components/app/Sidebar";
import { cn } from "@/lib/cn";

/**
 * Authenticated app shell: persistent sidebar (collapsible) + main content area.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Close mobile sidebar on resize to desktop
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const handler = (e: MediaQueryListEvent) => {
      if (e.matches) setIsMobileOpen(false);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return (
    <RequireAuth>
      <div className="flex min-h-screen bg-brutal-bg">
        <Sidebar
          isOpen={isMobileOpen}
          isCollapsed={isCollapsed}
          onClose={() => setIsMobileOpen(false)}
          onToggleCollapse={() => setIsCollapsed((v) => !v)}
        />

        {/* Main content — offset by sidebar width on desktop */}
        <div
          className={cn(
            "flex w-full min-w-0 flex-1 flex-col overflow-x-hidden transition-[margin-left] duration-200",
            isCollapsed
              ? "lg:ml-[var(--sidebar-collapsed-width)]"
              : "lg:ml-[var(--sidebar-width)]",
          )}
        >
          {children}
        </div>
      </div>
    </RequireAuth>
  );
}
