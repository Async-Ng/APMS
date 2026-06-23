import { useRouter } from "expo-router";
import { useEffect, useRef, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

import { BrutalButton } from "../ui/BrutalButton";
import { colors } from "../../constants/colors";
import { brutalCardStyle } from "../../lib/brutal-style";
import { useAuthStore } from "../../stores/auth-store";

interface RequireAuthProps {
  children: ReactNode;
}

function AuthLoading() {
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
      <Text style={{ fontSize: 16, fontWeight: "800", color: colors.ink }}>Đang xác thực...</Text>
      <Text style={{ fontSize: 13, color: colors.muted }}>Vui lòng đợi trong giây lát.</Text>
    </View>
  );
}

export function RequireAuth({ children }: RequireAuthProps) {
  const router = useRouter();
  const { user, isLoading, error, fetchMe } = useAuthStore();
  const redirectingRef = useRef(false);

  useEffect(() => {
    void fetchMe();
  }, [fetchMe]);

  useEffect(() => {
    if (isLoading || user || error || redirectingRef.current) {
      return;
    }

    redirectingRef.current = true;
    router.replace("/login");
  }, [isLoading, user, error, router]);

  if (user) {
    return <>{children}</>;
  }

  if (isLoading) {
    return <AuthLoading />;
  }

  if (error) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.bg,
          padding: 24,
        }}
      >
        <View style={{ ...brutalCardStyle, padding: 20, maxWidth: 400, gap: 14, width: "100%" }}>
          <Text style={{ color: colors.error, textAlign: "center", fontSize: 14 }}>{error}</Text>
          <BrutalButton label="Thử lại" onPress={() => void fetchMe()} variant="primary" fullWidth />
          <Pressable onPress={() => router.replace("/login")}>
            <Text style={{ color: colors.fptBlue, textAlign: "center", fontWeight: "700" }}>
              Về trang đăng nhập
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return <AuthLoading />;
}
