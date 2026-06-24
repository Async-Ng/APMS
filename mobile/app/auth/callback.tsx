import { fetchAuthSession, signOut } from "aws-amplify/auth";
import { Hub } from "aws-amplify/utils";
import { Link, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { colors } from "../../constants/colors";
import { brutalCardStyle } from "../../lib/brutal-style";
import "../../lib/amplify";
import { useAuthStore } from "../../stores/auth-store";

export default function AuthCallbackScreen() {
  const router = useRouter();
  const fetchMe = useAuthStore((state) => state.fetchMe);
  const [error, setError] = useState<string | null>(null);
  const finishedRef = useRef(false);

  useEffect(() => {
    async function finishSignIn() {
      if (finishedRef.current) return;

      try {
        const session = await fetchAuthSession({ forceRefresh: true });

        if (!session.tokens?.idToken) {
          setError("Đăng nhập không thành công. Vui lòng thử lại.");
          return;
        }

        finishedRef.current = true;
        await fetchMe();

        const currentUser = useAuthStore.getState().user;
        if (!currentUser) {
          try {
            await signOut();
          } catch {
            // Session may already be invalid
          }
          const authError =
            useAuthStore.getState().error ?? "Không thể xác thực tài khoản. Vui lòng thử lại.";
          setError(authError);
          return;
        }

        router.replace("/(tabs)/drive");
      } catch {
        setError("Không thể hoàn tất đăng nhập. Vui lòng thử lại.");
      }
    }

    const unsubscribe = Hub.listen("auth", ({ payload }) => {
      if (payload.event === "signInWithRedirect") {
        void finishSignIn();
      } else if (payload.event === "signInWithRedirect_failure") {
        setError("Đăng nhập thất bại. Vui lòng thử lại.");
      }
    });

    const retryTimer = setTimeout(() => void finishSignIn(), 1500);

    return () => {
      clearTimeout(retryTimer);
      unsubscribe();
    };
  }, [fetchMe, router]);

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: colors.bg }}>
        <View style={{ ...brutalCardStyle, padding: 20, maxWidth: 400, gap: 12 }}>
          <Text style={{ color: colors.error, textAlign: "center", fontSize: 14 }}>{error}</Text>
          <Link href="/login" style={{ color: colors.fptBlue, textAlign: "center", fontWeight: "700" }}>
            Về trang đăng nhập
          </Link>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg, padding: 24 }}>
      <View style={{ ...brutalCardStyle, padding: 24, alignItems: "center", gap: 12 }}>
        <ActivityIndicator size="large" color={colors.fptBlue} />
        <Text style={{ fontWeight: "800", fontSize: 18, color: colors.ink }}>Đang hoàn tất đăng nhập...</Text>
        <Text style={{ color: colors.muted }}>Vui lòng đợi trong giây lát.</Text>
      </View>
    </View>
  );
}
