"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { useAuthStore } from "@/stores/auth-store";

interface RequireAuthProps {
  children: React.ReactNode;
}

export function RequireAuth({ children }: RequireAuthProps) {
  const router = useRouter();
  const { user, isLoading, fetchMe } = useAuthStore();
  const redirectingRef = useRef(false);

  useEffect(() => {
    void fetchMe();
  }, [fetchMe]);

  useEffect(() => {
    if (isLoading || user || redirectingRef.current) {
      return;
    }

    redirectingRef.current = true;
    router.replace("/login");
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brutal-bg">
        <div className="flex flex-col items-center gap-3">
          <div
            className="h-8 w-8 animate-spin rounded-full border-2 border-brutal-ink border-t-brutal-primary"
            aria-hidden="true"
          />
          <p className="text-sm font-medium text-brutal-muted">Đang xác thực...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
