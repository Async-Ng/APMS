import { signOut } from "aws-amplify/auth";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, RefreshControl, SafeAreaView, ScrollView, Text, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { AdminStatsCard, type AdminStats } from "../../components/app/AdminStatsCard";
import { ProfileMenuItem } from "../../components/app/ProfileMenuItem";
import { ProfileUserCard } from "../../components/app/ProfileUserCard";
import { HeaderBar } from "../../components/ui/HeaderBar";
import { colors } from "../../constants/colors";
import { brutalCardStyle } from "../../lib/brutal-style";
import { api } from "../../lib/api-client";
import { useAuthStore } from "../../stores/auth-store";

export default function ProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, fetchMe } = useAuthStore();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isAdmin = useAuthStore((s) => (s.user as (typeof s.user & { role?: string }) | null)?.role === "admin");

  const adminStatsQuery = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: AdminStats }>("/admin/stats");
      return res.data.data;
    },
    enabled: isAdmin,
  });

  async function handleRefresh() {
    setIsRefreshing(true);
    await fetchMe();
    setIsRefreshing(false);
  }

  async function handleSignOut() {
    Alert.alert("Đăng xuất", "Bạn có chắc muốn đăng xuất?", [
      { text: "Huỷ", style: "cancel" },
      {
        text: "Đăng xuất",
        style: "destructive",
        onPress: async () => {
          await signOut();
          queryClient.clear();
          useAuthStore.getState().clearUser();
          router.replace("/login");
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <HeaderBar title="Hồ sơ" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.fptBlue} />
        }
      >
        <ProfileUserCard user={user} isAdmin={isAdmin} />

        {isAdmin && adminStatsQuery.data && <AdminStatsCard stats={adminStatsQuery.data} />}

        {/* Menu sections */}
        <View style={{ paddingHorizontal: 16 }}>
          <Text style={{ fontSize: 13, fontWeight: "800", color: colors.muted, marginBottom: 4 }}>DRIVE</Text>
          <View style={{ ...brutalCardStyle, padding: 4, gap: 0 }}>
            <ProfileMenuItem
              icon="star-outline"
              label="Đã gắn sao"
              subtitle="Truy cập nhanh các mục đã gắn sao"
              onPress={() => router.push("/(tabs)/drive/starred")}
            />
            <View style={{ height: 1, backgroundColor: "#E5E5E5", marginHorizontal: 16 }} />
            <ProfileMenuItem
              icon="trash-outline"
              label="Thùng rác"
              subtitle="Khôi phục hoặc xóa vĩnh viễn"
              onPress={() => router.push("/(tabs)/drive/trash")}
            />
          </View>
        </View>

        {isAdmin && (
          <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
            <Text style={{ fontSize: 13, fontWeight: "800", color: colors.muted, marginBottom: 4 }}>QUẢN TRỊ</Text>
            <View style={{ ...brutalCardStyle, padding: 4 }}>
              <ProfileMenuItem
                icon="shield-outline"
                label="Quản lý người dùng"
                subtitle="Xem và quản lý tất cả tài khoản"
                onPress={() => router.push("/admin/users")}
                badge="Admin"
              />
            </View>
          </View>
        )}

        <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
          <View style={{ ...brutalCardStyle, padding: 4 }}>
            <ProfileMenuItem icon="log-out-outline" label="Đăng xuất" onPress={handleSignOut} destructive />
          </View>
        </View>

        {/* App version */}
        <View style={{ alignItems: "center", marginTop: 32, gap: 4 }}>
          <View style={{ flexDirection: "row", gap: 3 }}>
            {[colors.fptBlue, colors.fptOrange, colors.fptGreen].map((c) => (
              <View
                key={c}
                style={{ width: 8, height: 14, backgroundColor: c, borderRadius: 2, borderWidth: 1, borderColor: colors.ink }}
              />
            ))}
          </View>
          <Text style={{ fontSize: 13, fontWeight: "800", color: colors.muted }}>APMS</Text>
          <Text style={{ fontSize: 11, color: colors.muted }}>v1.0.0 · FPT University</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
