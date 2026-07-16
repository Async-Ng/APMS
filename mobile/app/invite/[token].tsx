import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, SafeAreaView, Text, View } from "react-native";

import { BrutalButton } from "../../components/ui/BrutalButton";
import { colors } from "../../constants/colors";
import { brutalCardStyle } from "../../lib/brutal-style";
import { getErrorMessage } from "../../lib/api-error";
import { useAcceptInvite, useInvitePreview } from "../../hooks/useInvite";
import { useAuthStore } from "../../stores/auth-store";

export default function InviteScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuthStore();
  const { data: invite, isLoading, isError, error } = useInvitePreview(token);
  const acceptInvite = useAcceptInvite();

  function handleAccept() {
    if (!token) return;
    acceptInvite.mutate(token, {
      onSuccess: (result) => {
        if (result.resourceType === "document") {
          router.replace(`/documents/${result.resourceId}`);
        } else {
          router.replace(`/(tabs)/drive/${result.resourceId}`);
        }
      },
    });
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flex: 1, justifyContent: "center", padding: 24 }}>
        {isLoading || authLoading ? (
          <View style={{ alignItems: "center", gap: 12 }}>
            <ActivityIndicator size="large" color={colors.fptBlue} />
            <Text style={{ color: colors.muted, fontWeight: "600" }}>Đang tải lời mời...</Text>
          </View>
        ) : isError || !invite ? (
          <View style={{ ...brutalCardStyle, padding: 24, gap: 12, alignItems: "center" }}>
            <Ionicons name="alert-circle-outline" size={40} color={colors.error} />
            <Text style={{ fontSize: 17, fontWeight: "800", color: colors.ink, textAlign: "center" }}>
              Lời mời không hợp lệ
            </Text>
            <Text style={{ fontSize: 13, color: colors.muted, textAlign: "center" }}>
              {getErrorMessage(error, "Lời mời đã hết hạn hoặc không còn tồn tại.")}
            </Text>
            <BrutalButton label="Về trang chủ" onPress={() => router.replace("/(tabs)/drive")} variant="secondary" fullWidth />
          </View>
        ) : (
          <View style={{ ...brutalCardStyle, padding: 24, gap: 14, alignItems: "center" }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                borderWidth: 3,
                borderColor: colors.ink,
                backgroundColor: colors.fptOrange,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name={invite.resourceType === "folder" ? "folder-open" : "document-text"} size={28} color={colors.onBrand} />
            </View>
            <Text style={{ fontSize: 18, fontWeight: "800", color: colors.ink, textAlign: "center" }}>
              {invite.sharerName} đã mời bạn
            </Text>
            <Text style={{ fontSize: 14, color: colors.ink, textAlign: "center", fontWeight: "600" }}>
              {invite.resourceType === "folder" ? "Thư mục" : "Tài liệu"}: {invite.resourceName}
            </Text>
            <Text style={{ fontSize: 12, color: colors.muted, textAlign: "center" }}>
              Dành cho: {invite.email}
            </Text>

            {!user ? (
              <View style={{ width: "100%", gap: 10, marginTop: 8 }}>
                <Text style={{ fontSize: 13, color: colors.muted, textAlign: "center" }}>
                  Đăng nhập bằng {invite.email} để chấp nhận lời mời này.
                </Text>
                <BrutalButton label="Đăng nhập" onPress={() => router.push("/login")} variant="secondary" fullWidth />
              </View>
            ) : (
              <View style={{ width: "100%", gap: 10, marginTop: 8 }}>
                {acceptInvite.isError && (
                  <Text style={{ fontSize: 13, color: colors.error, textAlign: "center" }}>
                    {getErrorMessage(acceptInvite.error, "Chấp nhận lời mời thất bại. Vui lòng thử lại.")}
                  </Text>
                )}
                <BrutalButton
                  label="Chấp nhận lời mời"
                  onPress={handleAccept}
                  variant="primary"
                  loading={acceptInvite.isPending}
                  fullWidth
                />
              </View>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
