"use client";

import "@/lib/amplify";

import { AppShellProvider, useAppShell } from "@/components/app/AppShellContext";
import { OnboardingGate } from "@/components/app/onboarding/AcademicProfileWizard";
import { RequireAuth } from "@/components/app/RequireAuth";
import { Sidebar } from "@/components/app/Sidebar";
import { cn } from "@/lib/cn";

function AppShellInner({ children }: { children: React.ReactNode }) {
  const { isMobileOpen, isCollapsed, closeMobileMenu, toggleCollapse } = useAppShell();

  return (
    <div className="flex h-dvh min-h-0 overflow-hidden bg-brutal-bg">
      <Sidebar
        isOpen={isMobileOpen}
        isCollapsed={isCollapsed}
        onClose={closeMobileMenu}
        onToggleCollapse={toggleCollapse}
      />

      <div
        className={cn(
          "flex min-w-0 min-h-0 w-full flex-1 flex-col overflow-y-auto overscroll-contain transition-[padding-left] duration-200",
          isCollapsed
            ? "lg:pl-[var(--sidebar-collapsed-width)]"
            : "lg:pl-[var(--sidebar-width)]",
        )}
      >
        {children}
        <OnboardingGate />
      </div>
    </div>
  );
}

/**
 * Authenticated app shell: persistent sidebar (collapsible) + main content area.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <AppShellProvider>
        <AppShellInner>{children}</AppShellInner>
      </AppShellProvider>
    </RequireAuth>
  );
}
