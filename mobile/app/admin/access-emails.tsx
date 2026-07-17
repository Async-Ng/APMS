import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, SafeAreaView, Text, TextInput, View } from "react-native";

import { EmptyState } from "../../components/ui/EmptyState";
import { HeaderBadge, HeaderBar } from "../../components/ui/HeaderBar";
import { colors } from "../../constants/colors";
import { brutalCardStyle, brutalCtaStyle, pressedBrutalStyle } from "../../lib/brutal-style";
import { getErrorMessage } from "../../lib/api-error";
import { useToastStore } from "../../stores/toast-store";
import {
  type AccessEmailStatus,
  useAdminAccessEmails,
  useBulkCreateAccessEmails,
  useDeactivateAccessEmail,
  useUpdateAccessEmail,
} from "../../hooks/useAdminAccessEmails";
import { AddAccessEmailModal } from "../../components/app/admin/AddAccessEmailModal";

const STATUS_OPTIONS: { key: AccessEmailStatus; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "active", label: "Đang hoạt động" },
  { key: "inactive", label: "Đã tắt" },
];

export default function AdminAccessEmailsScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<AccessEmailStatus>("all");
  const [page, setPage] = useState(1);
  const [addVisible, setAddVisible] = useState(false);

  const { data, isLoading, refetch, isRefetching } = useAdminAccessEmails({ page, search, status });
  const bulkCreate = useBulkCreateAccessEmails();
  const updateEntry = useUpdateAccessEmail();
  const deactivateEntry = useDeactivateAccessEmail();

  function handleToggleActive(id: string, isActive: boolean) {
    updateEntry.mutate(
      { id, body: { isActive } },
      { onError: (err) => useToastStore.getState().show(getErrorMessage(err, "Cập nhật thất bại.")) },
    );
  }

  function handleDeactivate(id: string, email: string) {
    Alert.alert("Vô hiệu hoá", `Vô hiệu hoá quyền truy cập cho "${email}"?`, [
      { text: "Huỷ", style: "cancel" },
      {
        text: "Vô hiệu hoá",
        style: "destructive",
        onPress: () =>
          deactivateEntry.mutate(id, {
            onError: (err) => useToastStore.getState().show(getErrorMessage(err, "Không thể vô hiệu hoá.")),
          }),
      },
    ]);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <HeaderBar
        title="Email ngoại lệ"
        subtitle={data ? `${data.pagination.total} email` : undefined}
        onBack={() => router.back()}
        right={<HeaderBadge label="ADMIN" />}
      />

      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <Text style={{ fontSize: 12, color: colors.muted, marginBottom: 10, lineHeight: 17 }}>
          Danh sách email được phép truy cập ngoài các domain mặc định. Không quản lý domain tại đây.
        </Text>
      </View>

      <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
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
            onChangeText={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Tìm theo email hoặc ghi chú..."
            placeholderTextColor={colors.muted}
            style={{ flex: 1, fontSize: 14, color: colors.ink }}
            autoCapitalize="none"
          />
          {isLoading && <ActivityIndicator size="small" color={colors.fptBlue} />}
        </View>
      </View>

      <View style={{ flexDirection: "row", paddingHorizontal: 16, paddingBottom: 12, gap: 8 }}>
        {STATUS_OPTIONS.map((opt) => {
          const active = opt.key === status;
          return (
            <Pressable
              key={opt.key}
              onPress={() => {
                setStatus(opt.key);
                setPage(1);
              }}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: 999,
                borderWidth: 2,
                borderColor: colors.ink,
                backgroundColor: active ? colors.fptBlue : colors.surface,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "700", color: active ? colors.onBrand : colors.ink }}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        data={data?.entries ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 10, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={colors.fptBlue} />}
        ListEmptyComponent={
          !isLoading ? <EmptyState icon="mail-outline" title="Không có email nào" description="Nhấn nút + để thêm email ngoại lệ." /> : null
        }
        renderItem={({ item }) => (
          <View style={{ ...brutalCardStyle, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                borderWidth: 2,
                borderColor: colors.ink,
                backgroundColor: item.isActive ? colors.fptGreen : "#E5E5E5",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="mail" size={16} color={item.isActive ? colors.onBrand : colors.muted} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: colors.ink }}>{item.email}</Text>
              {item.note ? (
                <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }} numberOfLines={1}>
                  {item.note}
                </Text>
              ) : null}
            </View>
            <Pressable onPress={() => handleToggleActive(item.id, !item.isActive)} hitSlop={8}>
              <Ionicons name={item.isActive ? "toggle" : "toggle-outline"} size={30} color={item.isActive ? colors.fptGreen : colors.muted} />
            </Pressable>
            <Pressable onPress={() => handleDeactivate(item.id, item.email)} hitSlop={8}>
              <Ionicons name="trash-outline" size={20} color={colors.error} />
            </Pressable>
          </View>
        )}
      />

      {data && data.pagination.totalPages > 1 && (
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
            {page} / {data.pagination.totalPages}
          </Text>
          <Pressable
            onPress={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
            disabled={page >= data.pagination.totalPages}
            style={({ pressed }) => ({
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderWidth: 2,
              borderColor: page >= data.pagination.totalPages ? "#E5E5E5" : colors.ink,
              borderRadius: 10,
              backgroundColor: pressed ? "#F0F0F0" : "transparent",
              opacity: page >= data.pagination.totalPages ? 0.4 : 1,
            })}
          >
            <Text style={{ fontWeight: "700", color: colors.ink }}>Sau</Text>
          </Pressable>
        </View>
      )}

      <Pressable
        onPress={() => setAddVisible(true)}
        style={({ pressed }) => ({
          ...brutalCtaStyle,
          position: "absolute",
          right: 20,
          bottom: 24,
          width: 56,
          height: 56,
          borderRadius: 28,
          ...pressedBrutalStyle(pressed),
        })}
        accessibilityLabel="Thêm email"
      >
        <Ionicons name="add" size={26} color={colors.onBrand} />
      </Pressable>

      <AddAccessEmailModal
        visible={addVisible}
        loading={bulkCreate.isPending}
        onDismiss={() => setAddVisible(false)}
        onConfirm={(entries) => {
          bulkCreate.mutate(entries, {
            onSuccess: (result) => {
              setAddVisible(false);
              const { created, reactivated, alreadyActive, invalid } = result.summary;
              useToastStore
                .getState()
                .show(
                  `Đã thêm ${created + reactivated}${alreadyActive ? `, ${alreadyActive} đã tồn tại` : ""}${invalid ? `, ${invalid} không hợp lệ` : ""}`,
                  invalid > 0 ? "error" : "success",
                );
            },
            onError: (err) => useToastStore.getState().show(getErrorMessage(err, "Thêm email thất bại.")),
          });
        }}
      />
    </SafeAreaView>
  );
}
