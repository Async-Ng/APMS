import { useRouter } from "expo-router";
import { useEffect, useRef, type ReactNode } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { colors } from "../../constants/colors";
import { useAuthStore } from "../../stores/auth-store";

interface RequireAuthProps {
  children: ReactNode;
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

  return <>{children}</>;
}
