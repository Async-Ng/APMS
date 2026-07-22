import { Stack, useRouter } from "expo-router";
import { useEffect, useRef, type ReactNode } from "react";

import { RequireAuth } from "../../components/app/RequireAuth";
import { LoadingScreen } from "../../components/ui/LoadingScreen";
import { useAuthStore } from "../../stores/auth-store";

function RequireAdmin({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, isLoading } = useAuthStore();
  const redirectingRef = useRef(false);

  useEffect(() => {
    if (isLoading || user?.role === "admin" || redirectingRef.current) {
      return;
    }

    redirectingRef.current = true;
    router.replace("/(tabs)/profile");
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return <LoadingScreen />;
  }

  if (user.role !== "admin") {
    return null;
  }

  return <>{children}</>;
}

export default function AdminLayout() {
  return (
    <RequireAuth>
      <RequireAdmin>
        <Stack screenOptions={{ headerShown: false }} />
      </RequireAdmin>
    </RequireAuth>
  );
}
