import { signOut } from "aws-amplify/auth";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { StorageBar } from "../../components/ui/StorageBar";
import { colors } from "../../constants/colors";
import { brutalCardStyle } from "../../lib/brutal-style";
import { useAuthStore } from "../../stores/auth-store";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api-client";

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  disabledUsers: number;
  totalDocuments: number;
  totalFolders: number;
  totalStorageUsedBytes: number;
  documentsByStatus: Record<string, number>;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function MenuItem({
  icon,
  label,
  subtitle,
  onPress,
  destructive = false,
  badge,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle?: string;
  onPress: () => void;
  destructive?: boolean;
  badge?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        paddingVertical: 14,
        paddingHorizontal: 16,
        backgroundColor: pressed ? "#F0F0F0" : "transparent",
        borderRadius: 10,
        minHeight: 52,
      })}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          borderWidth: 2,
          borderColor: colors.ink,
          backgroundColor: destructive ? "#FEE2E2" : colors.surface,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: colors.ink,
          shadowOffset: { width: 2, height: 2 },
          shadowOpacity: 1,
          shadowRadius: 0,
          elevation: 2,
        }}
      >
        <Ionicons name={icon} size={18} color={destructive ? colors.error : colors.ink} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: "600", color: destructive ? colors.error : colors.ink }}>
          {label}
        </Text>
        {subtitle && <Text style={{ fontSize: 12, color: colors.muted }}>{subtitle}</Text>}
      </View>
      {badge && (
        <View
          style={{
            backgroundColor: colors.fptOrange,
            borderWidth: 1.5,
            borderColor: colors.ink,
            borderRadius: 999,
            paddingHorizontal: 7,
            paddingVertical: 1,
          }}
        >
          <Text style={{ fontSize: 10, fontWeight: "800", color: colors.onBrand }}>{badge}</Text>
        </View>
      )}
      {!badge && !destructive && <Ionicons name="chevron-forward" size={18} color={colors.muted} />}
    </Pressable>
  );
}

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

  const initials = user?.displayName
    ? user.displayName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.fptBlue} />
        }
      >
        {/* Header */}
        <View
          style={{
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderBottomWidth: 3,
            borderBottomColor: colors.ink,
            backgroundColor: colors.surface,
          }}
        >
          <Text style={{ fontSize: 24, fontWeight: "800", color: colors.ink }}>Hồ sơ</Text>
        </View>

        {/* User card */}
        <View style={{ padding: 16 }}>
          <View style={{ ...brutalCardStyle, padding: 20, gap: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  borderWidth: 3,
                  borderColor: colors.ink,
                  backgroundColor: colors.fptBlue,
                  alignItems: "center",
                  justifyContent: "center",
                  shadowColor: colors.ink,
                  shadowOffset: { width: 3, height: 3 },
                  shadowOpacity: 1,
                  shadowRadius: 0,
                  elevation: 3,
                }}
              >
                <Text style={{ fontSize: 24, fontWeight: "800", color: colors.onBrand }}>{initials}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 20, fontWeight: "800", color: colors.ink }} numberOfLines={1}>
                  {user?.displayName ?? "—"}
                </Text>
                <Text style={{ fontSize: 13, color: colors.muted }} numberOfLines={1}>
                  {user?.email ?? "—"}
                </Text>
                {isAdmin && (
                  <View
                    style={{
                      alignSelf: "flex-start",
                      backgroundColor: colors.fptOrange,
                      borderWidth: 1.5,
                      borderColor: colors.ink,
                      borderRadius: 999,
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      marginTop: 4,
                    }}
                  >
                    <Text style={{ fontSize: 10, fontWeight: "800", color: colors.onBrand }}>ADMIN</Text>
                  </View>
                )}
              </View>
            </View>

            {user && (
              <StorageBar
                usedBytes={user.storageUsedBytes}
                quotaBytes={user.storageQuotaBytes}
              />
            )}
          </View>
        </View>

        {/* Admin panel (if admin) */}
        {isAdmin && adminStatsQuery.data && (
          <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: "800", color: colors.muted, marginBottom: 10 }}>
              THỐNG KÊ HỆ THỐNG
            </Text>
            <View style={{ ...brutalCardStyle, padding: 16, gap: 0 }}>
              {[
                { label: "Tổng người dùng", value: String(adminStatsQuery.data.totalUsers), icon: "people-outline" as const },
                { label: "Người dùng hoạt động", value: String(adminStatsQuery.data.activeUsers), icon: "person-outline" as const },
                { label: "Tổng tài liệu", value: String(adminStatsQuery.data.totalDocuments), icon: "documents-outline" as const },
                { label: "Tổng thư mục", value: String(adminStatsQuery.data.totalFolders), icon: "folder-outline" as const },
                { label: "Dung lượng đã dùng", value: formatBytes(adminStatsQuery.data.totalStorageUsedBytes), icon: "server-outline" as const },
              ].map((stat, idx, arr) => (
                <View
                  key={stat.label}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingVertical: 12,
                    borderBottomWidth: idx < arr.length - 1 ? 1.5 : 0,
                    borderBottomColor: "#E5E5E5",
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <Ionicons name={stat.icon} size={16} color={colors.muted} />
                    <Text style={{ fontSize: 14, color: colors.muted }}>{stat.label}</Text>
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: "800", color: colors.ink }}>{stat.value}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Menu sections */}
        <View style={{ paddingHorizontal: 16 }}>
          <Text style={{ fontSize: 13, fontWeight: "800", color: colors.muted, marginBottom: 4 }}>DRIVE</Text>
          <View style={{ ...brutalCardStyle, padding: 4, gap: 0 }}>
            <MenuItem
              icon="star-outline"
              label="Đã gắn sao"
              subtitle="Truy cập nhanh các mục đã gắn sao"
              onPress={() => router.push("/(tabs)/drive/starred")}
            />
            <View style={{ height: 1, backgroundColor: "#E5E5E5", marginHorizontal: 16 }} />
            <MenuItem
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
              <MenuItem
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
            <MenuItem
              icon="log-out-outline"
              label="Đăng xuất"
              onPress={handleSignOut}
              destructive
            />
          </View>
        </View>

        {/* App version */}
        <View style={{ alignItems: "center", marginTop: 32, gap: 4 }}>
          <View style={{ flexDirection: "row", gap: 3 }}>
            {[colors.fptBlue, colors.fptOrange, colors.fptGreen].map((c, i) => (
              <View
                key={i}
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
