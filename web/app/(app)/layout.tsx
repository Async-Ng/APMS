"use client";

import "@/lib/amplify";
import { useEffect, useState } from "react";

import { Sidebar } from "@/components/app/Sidebar";
import { cn } from "@/lib/cn";
import { useAuthStore } from "@/stores/auth-store";

/**
 * Authenticated app shell: persistent sidebar (collapsible) + main content area.
 * Fetches the current user profile on mount.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { fetchMe } = useAuthStore();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Hydrate user profile when the shell first mounts
  useEffect(() => {
    void fetchMe();
  }, [fetchMe]);

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
          "flex min-w-0 flex-1 flex-col transition-[margin-left] duration-200",
          "lg:ml-60",
          isCollapsed && "lg:ml-16",
        )}
      >
        {children}
      </div>
    </div>
  );
}
