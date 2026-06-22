"use client";

import { signOut } from "aws-amplify/auth";
import {
  HardDrive,
  Globe,
  LogOut,
  Menu,
  MessageSquare,
  Share2,
  ShieldCheck,
  Star,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { StorageBar } from "@/components/ui/StorageBar";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/cn";
import { useAuthStore } from "@/stores/auth-store";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Drive của tôi",
    href: "/drive",
    icon: <HardDrive className="h-5 w-5 shrink-0" />,
  },
  {
    label: "Đã gắn sao",
    href: "/starred",
    icon: <Star className="h-5 w-5 shrink-0" />,
  },
  {
    label: "Đã chia sẻ",
    href: "/shared",
    icon: <Share2 className="h-5 w-5 shrink-0" />,
  },
  {
    label: "Tài liệu nội bộ",
    href: "/forum",
    icon: <Globe className="h-5 w-5 shrink-0" />,
  },
  {
    label: "Trò chuyện AI",
    href: "/chat",
    icon: <MessageSquare className="h-5 w-5 shrink-0" />,
  },
  {
    label: "Thùng rác",
    href: "/trash",
    icon: <Trash2 className="h-5 w-5 shrink-0" />,
  },
  {
    label: "Quản trị",
    href: "/admin",
    icon: <ShieldCheck className="h-5 w-5 shrink-0" />,
    adminOnly: true,
  },
];

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
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, clearUser } = useAuthStore();

  const handleSignOut = useCallback(async () => {
    await signOut();
    clearUser();
    queryClient.clear(); // xóa toàn bộ cache (sessions, documents, ...) tránh lộ data sang user khác
    router.replace("/login");
  }, [clearUser, queryClient, router]);

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.adminOnly || user?.role === "admin",
  );

  const isActive = (href: string) =>
    href === "/drive"
      ? pathname === "/drive" || pathname.startsWith("/drive/")
      : pathname.startsWith(href);

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
          "fixed left-0 top-0 flex h-full flex-col border-r-3 border-brutal-ink bg-brutal-surface transition-[width,transform] duration-200 ease-out",
          isCollapsed ? "w-16" : "w-60",
          // Mobile: slide in/out
          "lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
        style={{ zIndex: "var(--z-sidebar)" }}
      >
        {/* Logo + collapse toggle */}
        <div
          className={cn(
            "flex items-center border-b-3 border-brutal-ink px-3 py-3",
            isCollapsed ? "justify-center" : "justify-between",
          )}
        >
          {!isCollapsed && (
            <Link
              href="/drive"
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
                <X className="h-4 w-4" />
              )}
            </button>
          </Tooltip>
        </div>

        {/* Nav items */}
        <nav aria-label="Điều hướng Drive" className="flex-1 overflow-y-auto py-3">
          <ul className="space-y-1 px-2">
            {visibleItems.map((item) => {
              const active = isActive(item.href);
              return (
                <li key={item.href}>
                  <Tooltip
                    content={item.label}
                    side="right"
                  >
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
                        <span className="truncate">{item.label}</span>
                      )}
                    </Link>
                  </Tooltip>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Storage bar */}
        {!isCollapsed && user && (
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
            "flex items-center gap-3 border-t-3 border-brutal-ink p-3",
            isCollapsed && "justify-center",
          )}
        >
          <Tooltip content="Hồ sơ của tôi" side="top">
            <Link
              href="/profile"
              className={cn(
                "focus-brutal flex items-center gap-3 rounded-xl",
                isCollapsed ? "p-1" : "p-1.5",
              )}
              aria-label="Mở hồ sơ"
            >
              {user?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatarUrl}
                  alt={user.displayName}
                  width={36}
                  height={36}
                  className="h-9 w-9 shrink-0 rounded-xl border-2 border-brutal-ink object-cover shadow-brutal-sm"
                />
              ) : (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-brutal-ink bg-brutal-secondary text-sm font-bold text-white shadow-brutal-sm">
                  {user?.displayName?.charAt(0).toUpperCase() ?? "?"}
                </div>
              )}

          {!isCollapsed && (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-brutal-ink">
                  {user?.displayName ?? "—"}
                </p>
                <p className="truncate text-xs text-brutal-muted">{user?.email}</p>
              </div>
            </>
          )}
            </Link>
          </Tooltip>

          {!isCollapsed && (
            <>
              <Tooltip content="Đăng xuất" side="top">
                <button
                  onClick={() => void handleSignOut()}
                  className="focus-brutal flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-brutal-ink bg-brutal-bg shadow-brutal-sm transition-all hover:bg-brutal-danger hover:text-white active:translate-y-0.5 active:shadow-[0_0_0_#1A1A1A]"
                  aria-label="Đăng xuất"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </Tooltip>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
