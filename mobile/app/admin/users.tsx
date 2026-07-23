import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, SafeAreaView, Text, TextInput, View } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { AdminUserCard, type AdminUser } from "../../components/app/AdminUserCard";
import { HeaderBadge, HeaderBar } from "../../components/ui/HeaderBar";
import { colors } from "../../constants/colors";
import { api } from "../../lib/api-client";

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
      <HeaderBar
        title="Quản lý người dùng"
        subtitle={data ? `${data.total} người dùng` : undefined}
        onBack={() => router.back()}
        right={<HeaderBadge label="ADMIN" />}
      />

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
          <AdminUserCard
            user={item}
            onToggleDisable={() => {
              if (item.isDisabled) {
                toggleDisable.mutate({ id: item.id, isDisabled: false });
                return;
              }
              Alert.alert(
                "Khóa tài khoản này?",
                `${item.displayName} (${item.email}) sẽ không thể đăng nhập cho đến khi được mở khóa lại.`,
                [
                  { text: "Huỷ", style: "cancel" },
                  {
                    text: "Khóa tài khoản",
                    style: "destructive",
                    onPress: () => toggleDisable.mutate({ id: item.id, isDisabled: true }),
                  },
                ],
              );
            }}
          />
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
            <Text style={{ fontWeight: "700", color: colors.ink }}>Trước</Text>
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
            <Text style={{ fontWeight: "700", color: colors.ink }}>Sau</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}
