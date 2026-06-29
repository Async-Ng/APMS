"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { LoadingScreen } from "@/components/ui/Spinner";
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
        <LoadingScreen message="Đang xác thực..." />
      </div>
    );
  }

  return <>{children}</>;
}
