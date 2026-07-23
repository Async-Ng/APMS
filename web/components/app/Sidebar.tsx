"use client";

import { signOut } from "aws-amplify/auth";
import {
  GraduationCap,
  HardDrive,
  Globe,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  MessageSquare,
  PanelLeftClose,
  Share2,
  Trash2,
  User2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";

import {
  ADMIN_TABS,
  parseAdminTab,
  type AdminTabId,
} from "@/components/app/admin/admin-tabs";
import { StorageBar } from "@/components/ui/StorageBar";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/cn";
import { useAdminStats } from "@/lib/queries/admin";
import { useAuthStore } from "@/stores/auth-store";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
  tabId?: AdminTabId;
}

const ADMIN_TAB_ICONS: Record<AdminTabId, React.ReactNode> = {
  overview: <LayoutDashboard className="h-5 w-5 shrink-0" />,
  users: <Users className="h-5 w-5 shrink-0" />,
  "access-emails": <Mail className="h-5 w-5 shrink-0" />,
  academic: <GraduationCap className="h-5 w-5 shrink-0" />,
};

const NAV_ITEMS: NavItem[] = [
  {
    label: "Drive của tôi",
    href: "/drive",
    icon: <HardDrive className="h-5 w-5 shrink-0" />,
  },
  {
    label: "Đã chia sẻ",
    href: "/shared",
    icon: <Share2 className="h-5 w-5 shrink-0" />,
  },
  {
    label: "Thư viện công khai",
    href: "/library",
    icon: <Globe className="h-5 w-5 shrink-0" />,
  },
  {
    label: "Trò chuyện AI",
    href: "/chat",
    icon: <MessageSquare className="h-5 w-5 shrink-0" />,
  },
  {
    label: "Hồ sơ của tôi",
    href: "/profile",
    icon: <User2 className="h-5 w-5 shrink-0" />,
  },
  {
    label: "Thùng rác",
    href: "/trash",
    icon: <Trash2 className="h-5 w-5 shrink-0" />,
  },
];

function formatDisplayName(user: { displayName: string; email: string }): string {
  if (user.displayName.trim() && user.displayName !== user.email) {
    return user.displayName;
  }
  const localPart = user.email.split("@")[0];
  return localPart || "Tài khoản";
}

interface SidebarProps {
  isOpen: boolean;
  isCollapsed: boolean;
  onClose: () => void;
  onToggleCollapse: () => void;
}

export function Sidebar({
  isOpen,
  isCollapsed,
  onClose,
  onToggleCollapse,
}: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, clearUser } = useAuthStore();

  const showAdminNav = user?.role === "admin";
  const { data: adminStats } = useAdminStats({ enabled: showAdminNav });
  const activeAdminTab = parseAdminTab(searchParams.get("tab"));
  const homeHref = showAdminNav ? "/admin?tab=overview" : "/drive";

  const handleSignOut = useCallback(async () => {
    await signOut();
    clearUser();
    queryClient.clear(); // xóa toàn bộ cache (sessions, documents, ...) tránh lộ data sang user khác
    router.replace("/login");
  }, [clearUser, queryClient, router]);

  const visibleItems = useMemo((): NavItem[] => {
    if (showAdminNav) {
      return ADMIN_TABS.map((tab) => ({
        label: tab.label,
        href: `/admin?tab=${tab.id}`,
        icon: ADMIN_TAB_ICONS[tab.id],
        tabId: tab.id,
        badge:
          tab.id === "users" && adminStats?.totalUsers
            ? adminStats.totalUsers
            : undefined,
      }));
    }

    return NAV_ITEMS;
  }, [adminStats, showAdminNav]);

  const isActive = (item: NavItem) => {
    if (showAdminNav && item.tabId) {
      if (pathname.startsWith("/admin/curricula")) {
        return item.tabId === "academic";
      }
      if (!pathname.startsWith("/admin")) {
        return false;
      }
      return activeAdminTab === item.tabId;
    }

    if (item.href === "/drive") {
      return pathname === "/drive" || pathname.startsWith("/drive/");
    }
    if (item.href === "/library") {
      return pathname.startsWith("/library") || pathname.startsWith("/forum");
    }
    return pathname.startsWith(item.href);
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-brutal-ink/40 backdrop-blur-sm lg:hidden"
          style={{ zIndex: "var(--z-sidebar)" }}
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside
        id="sidebar"
        aria-label="Điều hướng chính"
        className={cn(
          "fixed left-0 top-0 flex h-dvh flex-col overflow-x-hidden border-r-2 border-brutal-ink bg-brutal-surface transition-[width,transform] duration-200 ease-out",
          isCollapsed
            ? "w-[var(--sidebar-collapsed-width)]"
            : "w-[var(--sidebar-width)]",
          // Mobile: slide in/out
          "lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
        style={{ zIndex: "var(--z-sidebar)" }}
      >
        {/* Logo + collapse toggle */}
        <div
          className={cn(
            "flex h-[var(--topbar-height)] shrink-0 items-center border-b-2 border-brutal-ink px-3",
            isCollapsed ? "justify-center" : "justify-between",
          )}
        >
          {!isCollapsed && (
            <Link
              href={homeHref}
              className="focus-brutal flex items-center gap-2 rounded"
              onClick={onClose}
            >
              {/* FPT tri-color bar */}
              <div className="flex h-7 w-1 flex-col overflow-hidden rounded-full">
                <span className="flex-1 bg-fpt-blue" />
                <span className="flex-1 bg-fpt-orange" />
                <span className="flex-1 bg-fpt-green" />
              </div>
              <span className="font-heading text-lg font-extrabold tracking-tight text-brutal-ink">
                APMS
              </span>
            </Link>
          )}

          <Tooltip content={isCollapsed ? "Mở rộng" : "Thu gọn"} side="right">
            <button
              onClick={onToggleCollapse}
              className="focus-brutal flex h-8 w-8 items-center justify-center rounded-lg border-2 border-brutal-ink bg-brutal-bg shadow-brutal-sm transition-all hover:-translate-y-0.5 hover:shadow-brutal active:translate-y-0 active:shadow-[0_0_0_#1A1A1A]"
              aria-label={isCollapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}
            >
              {isCollapsed ? (
                <Menu className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </button>
          </Tooltip>
        </div>

        {/* Nav items */}
        <nav
          aria-label={showAdminNav ? "Điều hướng quản trị" : "Điều hướng Drive"}
          className="flex-1 overflow-y-auto py-3"
        >
          <ul className="space-y-1 px-2">
            {visibleItems.map((item) => {
              const active = isActive(item);
              const link = (
                <Link
                  href={item.href}
                  onClick={onClose}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "focus-brutal flex min-h-[44px] items-center gap-3 rounded-xl border-2 px-3 font-heading text-sm font-bold transition-all duration-150",
                    isCollapsed && "justify-center px-0",
                    active
                      ? "border-brutal-ink bg-brutal-primary text-brutal-on-brand shadow-brutal-sm"
                      : "border-transparent text-brutal-ink hover:border-brutal-ink hover:bg-brutal-bg hover:shadow-brutal-sm",
                  )}
                >
                  {item.icon}
                  {!isCollapsed && (
                    <>
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      {item.badge !== undefined && item.badge > 0 && (
                        <span
                          className={cn(
                            "rounded-full border-2 border-brutal-ink px-1.5 py-0.5 text-xs tabular-nums",
                            active ? "bg-brutal-on-brand/20" : "bg-brutal-bg",
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </Link>
              );

              return (
                <li key={item.tabId ?? item.href}>
                  {isCollapsed ? (
                    <Tooltip content={item.label} side="right">
                      {link}
                    </Tooltip>
                  ) : (
                    link
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Storage bar (student surfaces only) */}
        {!isCollapsed && user && !showAdminNav && (
          <div className="border-t-2 border-brutal-ink py-3">
            <StorageBar
              usedBytes={user.storageUsedBytes}
              quotaBytes={user.storageQuotaBytes}
            />
          </div>
        )}

        {/* User section */}
        <div
          className={cn(
            "mt-auto w-full min-w-0 border-t-2 border-brutal-ink p-3",
            isCollapsed && "flex justify-center",
          )}
        >
          {isCollapsed ? (
            <Tooltip content="Hồ sơ của tôi" side="right">
              <Link
                href="/profile"
                className="focus-brutal flex rounded-xl p-1"
                aria-label="Mở hồ sơ"
              >
                {user?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatarUrl}
                    alt={user ? formatDisplayName(user) : "Hồ sơ"}
                    width={36}
                    height={36}
                    className="h-9 w-9 shrink-0 rounded-xl border-2 border-brutal-ink object-cover shadow-brutal-sm"
                  />
                ) : (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-brutal-ink bg-brutal-secondary text-sm font-bold text-white shadow-brutal-sm">
                    {user ? formatDisplayName(user).charAt(0).toUpperCase() : "?"}
                  </div>
                )}
              </Link>
            </Tooltip>
          ) : (
            <div className="flex w-full min-w-0 items-center gap-2">
              <Link
                href="/profile"
                className="focus-brutal flex min-w-0 flex-1 items-center gap-2 rounded-xl p-1.5 transition-colors hover:bg-brutal-bg"
                aria-label="Mở hồ sơ"
                title="Hồ sơ của tôi"
              >
                {user?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatarUrl}
                    alt={user ? formatDisplayName(user) : "Hồ sơ"}
                    width={36}
                    height={36}
                    className="h-9 w-9 shrink-0 rounded-xl border-2 border-brutal-ink object-cover shadow-brutal-sm"
                  />
                ) : (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-brutal-ink bg-brutal-secondary text-sm font-bold text-white shadow-brutal-sm">
                    {user ? formatDisplayName(user).charAt(0).toUpperCase() : "?"}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-brutal-ink">
                    {user ? formatDisplayName(user) : "—"}
                  </p>
                  <p className="truncate text-xs text-brutal-muted">{user?.email ?? "—"}</p>
                </div>
              </Link>

              <Tooltip content="Đăng xuất" side="top">
                <button
                  onClick={() => void handleSignOut()}
                  className="focus-brutal flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-brutal-ink bg-brutal-bg shadow-brutal-sm transition-all hover:bg-brutal-danger hover:text-white active:translate-y-0.5 active:shadow-[0_0_0_#1A1A1A]"
                  aria-label="Đăng xuất"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </Tooltip>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
