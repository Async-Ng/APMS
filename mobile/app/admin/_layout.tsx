import { Stack, useRouter } from "expo-router";
import { useEffect, useRef, type ReactNode } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { RequireAuth } from "../../components/app/RequireAuth";
import { colors } from "../../constants/colors";
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
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.bg,
          gap: 12,
        }}
      >
        <ActivityIndicator size="large" color={colors.fptBlue} />
        <Text style={{ fontSize: 14, fontWeight: "600", color: colors.muted }}>Đang xác thực...</Text>
      </View>
    );
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
