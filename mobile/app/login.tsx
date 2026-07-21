import { Ionicons } from "@expo/vector-icons";
import { signInWithRedirect, signOut } from "aws-amplify/auth";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { SafeAreaView, ScrollView, Text, View } from "react-native";

import { BrutalButton } from "../components/ui/BrutalButton";
import { colors } from "../constants/colors";
import { brutalCardStyle } from "../lib/brutal-style";
import "../lib/amplify";
import { useAuthStore } from "../stores/auth-store";

const features: { icon: keyof typeof Ionicons.glyphMap; text: string }[] = [
  { icon: "document-text-outline", text: "Lưu trữ tài liệu PDF, DOCX, PPTX theo cây thư mục riêng" },
  { icon: "sparkles-outline", text: "Trò chuyện với AI dựa trên chính tài liệu của bạn, có trích dẫn rõ ràng" },
  { icon: "shield-checkmark-outline", text: "Đăng nhập an toàn bằng Google" },
];

export default function LoginScreen() {
  const router = useRouter();
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const { user, isLoading: isAuthLoading, fetchMe, clearUser } = useAuthStore();

  useEffect(() => {
    void fetchMe();
  }, [fetchMe]);

  useEffect(() => {
    if (!isAuthLoading && user) {
      router.replace("/(tabs)/drive");
    }
  }, [isAuthLoading, user, router]);

  async function handleGoogleSignIn() {
    if (signingIn) return;
    setAuthError(null);
    setSigningIn(true);
    try {
      await signInWithRedirect({ provider: "Google" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (!message.toLowerCase().includes("canceled")) {
        setAuthError("Đăng nhập thất bại. Vui lòng thử lại.");
      }
    } finally {
      setSigningIn(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    clearUser();
  }

  function renderSignInCard() {
    if (isAuthLoading) {
      return <Text style={{ textAlign: "center", color: colors.muted, fontSize: 14 }}>Đang tải...</Text>;
    }

    if (user) {
      return (
        <View style={{ gap: 14 }}>
          <View style={{ gap: 6 }}>
            <Text style={{ textAlign: "center", fontSize: 20, fontWeight: "800", color: colors.ink }}>
              Chào mừng trở lại
            </Text>
            <Text style={{ textAlign: "center", color: colors.muted, fontSize: 13 }}>
              Bạn đã đăng nhập và sẵn sàng.
            </Text>
          </View>
          <BrutalButton
            label={`Tiếp tục với ${user.displayName}`}
            onPress={() => router.replace("/(tabs)/drive")}
            variant="primary"
            fullWidth
            size="lg"
          />
          <BrutalButton label="Đăng xuất" onPress={() => void handleSignOut()} variant="secondary" fullWidth />
        </View>
      );
    }

    return (
      <>
        {authError && (
          <Text style={{ color: colors.error, fontSize: 13, textAlign: "center" }}>{authError}</Text>
        )}
        <BrutalButton
          label={signingIn ? "Đang mở trình duyệt..." : "Tiếp tục với Google"}
          onPress={() => void handleGoogleSignIn()}
          disabled={signingIn}
          loading={signingIn}
          variant="secondary"
          fullWidth
          size="lg"
        />
        <Text style={{ textAlign: "center", color: colors.muted, fontSize: 11 }}>
          Tài khoản của bạn được bảo vệ trong quá trình đăng nhập
        </Text>
      </>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: "center", gap: 28 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignItems: "center", gap: 12 }}>
          <View style={{ flexDirection: "row", gap: 3 }}>
            {[colors.fptBlue, colors.fptOrange, colors.fptGreen].map((c) => (
              <View
                key={c}
                style={{
                  width: 14,
                  height: 26,
                  backgroundColor: c,
                  borderWidth: 2,
                  borderColor: colors.ink,
                  borderRadius: 3,
                }}
              />
            ))}
          </View>
          <Text style={{ fontSize: 30, fontWeight: "800", color: colors.ink }}>APMS</Text>
          <Text style={{ fontSize: 14, color: colors.muted, textAlign: "center", lineHeight: 20 }}>
            Quản lý tài liệu học tập & trò chuyện với AI{"\n"}dựa trên chính tài liệu của bạn
          </Text>
        </View>

        <View style={{ ...brutalCardStyle, padding: 20, gap: 14 }}>{renderSignInCard()}</View>

        <View style={{ gap: 12 }}>
          {features.map((f) => (
            <View key={f.text} style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  borderWidth: 2,
                  borderColor: colors.ink,
                  backgroundColor: colors.surface,
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Ionicons name={f.icon} size={18} color={colors.fptOrange} />
              </View>
              <Text style={{ flex: 1, fontSize: 13, color: colors.muted, lineHeight: 19, paddingTop: 6 }}>
                {f.text}
              </Text>
            </View>
          ))}
        </View>

        <Text style={{ textAlign: "center", fontSize: 11, color: colors.muted }}>
          Đại học FPT · Trung tâm học tập
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
