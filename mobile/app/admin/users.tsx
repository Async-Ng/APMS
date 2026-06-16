import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { colors } from "../../constants/colors";
import { brutalCardStyle } from "../../lib/brutal-style";
import { api } from "../../lib/api-client";

interface AdminUser {
  id: string;
  displayName: string;
  email: string;
  role: "user" | "admin";
  isDisabled: boolean;
  storageUsedBytes: number;
  storageQuotaBytes: number;
  createdAt: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AdminUsersScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["admin", "users", page, search],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: { users: AdminUser[]; total: number; page: number; pages: number } }>(
        "/admin/users",
        { params: { page, limit: 20, search: search.trim() || undefined } },
      );
      return res.data.data;
    },
  });

  const toggleDisable = useMutation({
    mutationFn: async ({ id, isDisabled }: { id: string; isDisabled: boolean }) => {
      await api.patch(`/admin/users/${id}`, { isDisabled });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 3,
          borderBottomColor: colors.ink,
          backgroundColor: colors.surface,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => ({
            width: 36,
            height: 36,
            borderRadius: 10,
            borderWidth: 2,
            borderColor: colors.ink,
            backgroundColor: pressed ? "#F0F0F0" : colors.surface,
            alignItems: "center",
            justifyContent: "center",
          })}
        >
          <Ionicons name="arrow-back" size={20} color={colors.ink} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: "800", color: colors.ink }}>Manage Users</Text>
          {data && (
            <Text style={{ fontSize: 12, color: colors.muted }}>{data.total} total users</Text>
          )}
        </View>
        <View
          style={{
            backgroundColor: colors.fptOrange,
            borderWidth: 1.5,
            borderColor: colors.ink,
            borderRadius: 999,
            paddingHorizontal: 8,
            paddingVertical: 2,
          }}
        >
          <Text style={{ fontSize: 10, fontWeight: "800", color: colors.onBrand }}>ADMIN</Text>
        </View>
      </View>

      {/* Search */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            backgroundColor: colors.surface,
            borderWidth: 3,
            borderColor: colors.ink,
            borderRadius: 12,
            paddingHorizontal: 12,
            minHeight: 48,
          }}
        >
          <Ionicons name="search-outline" size={18} color={colors.muted} />
          <TextInput
            value={search}
            onChangeText={(v) => { setSearch(v); setPage(1); }}
            placeholder="Tìm theo tên hoặc email..."
            placeholderTextColor={colors.muted}
            style={{ flex: 1, fontSize: 14, color: colors.ink }}
            autoCapitalize="none"
          />
          {isLoading && <ActivityIndicator size="small" color={colors.fptBlue} />}
        </View>
      </View>

      <FlatList
        data={data?.users ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 10, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={colors.fptBlue} />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={{ alignItems: "center", paddingTop: 40 }}>
              <Text style={{ color: colors.muted, fontSize: 14 }}>Không tìm thấy người dùng</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={{ ...brutalCardStyle, padding: 14, gap: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  borderWidth: 2,
                  borderColor: colors.ink,
                  backgroundColor: item.isDisabled ? "#E5E5E5" : colors.fptBlue,
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: "800", color: item.isDisabled ? colors.muted : colors.onBrand }}>
                  {item.displayName[0]?.toUpperCase() ?? "?"}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: colors.ink }}>{item.displayName}</Text>
                  {item.role === "admin" && (
                    <View style={{ backgroundColor: colors.fptOrange, borderWidth: 1.5, borderColor: colors.ink, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 1 }}>
                      <Text style={{ fontSize: 9, fontWeight: "800", color: colors.onBrand }}>ADMIN</Text>
                    </View>
                  )}
                  {item.isDisabled && (
                    <View style={{ backgroundColor: "#FEE2E2", borderWidth: 1.5, borderColor: colors.ink, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 1 }}>
                      <Text style={{ fontSize: 9, fontWeight: "800", color: colors.error }}>DISABLED</Text>
                    </View>
                  )}
                </View>
                <Text style={{ fontSize: 12, color: colors.muted }}>{item.email}</Text>
              </View>
            </View>

            {/* Storage bar */}
            <View style={{ gap: 4 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 11, color: colors.muted }}>Storage</Text>
                <Text style={{ fontSize: 11, color: colors.muted }}>
                  {formatBytes(item.storageUsedBytes)} / {formatBytes(item.storageQuotaBytes)}
                </Text>
              </View>
              <View style={{ height: 6, borderWidth: 1.5, borderColor: colors.ink, borderRadius: 999, backgroundColor: "#F0F0F0", overflow: "hidden" }}>
                <View
                  style={{
                    width: `${Math.min((item.storageUsedBytes / item.storageQuotaBytes) * 100, 100)}%`,
                    height: "100%",
                    backgroundColor: colors.fptGreen,
                  }}
                />
              </View>
            </View>

            {/* Toggle disable */}
            <Pressable
              onPress={() => toggleDisable.mutate({ id: item.id, isDisabled: !item.isDisabled })}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                paddingVertical: 8,
                borderWidth: 2,
                borderColor: item.isDisabled ? colors.fptGreen : colors.error,
                borderRadius: 10,
                backgroundColor: pressed ? "#F0F0F0" : "transparent",
                minHeight: 40,
              })}
              accessibilityRole="button"
              accessibilityLabel={item.isDisabled ? "Enable user" : "Disable user"}
            >
              <Ionicons
                name={item.isDisabled ? "checkmark-circle-outline" : "ban-outline"}
                size={16}
                color={item.isDisabled ? colors.fptGreen : colors.error}
              />
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "700",
                  color: item.isDisabled ? colors.fptGreen : colors.error,
                }}
              >
                {item.isDisabled ? "Enable account" : "Disable account"}
              </Text>
            </Pressable>
          </View>
        )}
      />

      {/* Pagination */}
      {data && data.pages > 1 && (
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            gap: 12,
            paddingVertical: 14,
            borderTopWidth: 2,
            borderTopColor: "#E5E5E5",
          }}
        >
          <Pressable
            onPress={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            style={({ pressed }) => ({
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderWidth: 2,
              borderColor: page <= 1 ? "#E5E5E5" : colors.ink,
              borderRadius: 10,
              backgroundColor: pressed ? "#F0F0F0" : "transparent",
              opacity: page <= 1 ? 0.4 : 1,
            })}
          >
            <Text style={{ fontWeight: "700", color: colors.ink }}>Previous</Text>
          </Pressable>
          <Text style={{ fontSize: 13, color: colors.muted, fontWeight: "600" }}>
            {page} / {data.pages}
          </Text>
          <Pressable
            onPress={() => setPage((p) => Math.min(data.pages, p + 1))}
            disabled={page >= data.pages}
            style={({ pressed }) => ({
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderWidth: 2,
              borderColor: page >= data.pages ? "#E5E5E5" : colors.ink,
              borderRadius: 10,
              backgroundColor: pressed ? "#F0F0F0" : "transparent",
              opacity: page >= data.pages ? 0.4 : 1,
            })}
          >
            <Text style={{ fontWeight: "700", color: colors.ink }}>Next</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}
