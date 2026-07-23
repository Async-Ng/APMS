"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuthStore } from "@/stores/auth-store";

const STUDENT_ROUTE_PREFIXES = [
  "/drive",
  "/shared",
  "/library",
  "/forum",
  "/chat",
  "/trash",
  "/starred",
  "/search",
] as const;

function isStudentRoute(pathname: string): boolean {
  return STUDENT_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/** Redirect admins away from student-facing routes to the admin home. */
export function AdminHomeGate() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);

  useEffect(() => {
    if (isLoading || !user || user.role !== "admin") return;
    if (!isStudentRoute(pathname)) return;
    router.replace("/admin?tab=overview");
  }, [isLoading, pathname, router, user]);

  return null;
}
