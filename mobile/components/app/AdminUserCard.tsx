import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { colors } from "../../constants/colors";
import { brutalCardStyle } from "../../lib/brutal-style";

export interface AdminUser {
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

export function AdminUserCard({ user, onToggleDisable }: { user: AdminUser; onToggleDisable: () => void }) {
  return (
    <View style={{ ...brutalCardStyle, padding: 14, gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            borderWidth: 2,
            borderColor: colors.ink,
            backgroundColor: user.isDisabled ? "#E5E5E5" : colors.fptBlue,
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: "800", color: user.isDisabled ? colors.muted : colors.onBrand }}>
            {user.displayName[0]?.toUpperCase() ?? "?"}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: colors.ink }}>{user.displayName}</Text>
            {user.role === "admin" && (
              <View style={{ backgroundColor: colors.fptOrange, borderWidth: 1.5, borderColor: colors.ink, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 1 }}>
                <Text style={{ fontSize: 9, fontWeight: "800", color: colors.onBrand }}>ADMIN</Text>
              </View>
            )}
            {user.isDisabled && (
              <View style={{ backgroundColor: "#FEE2E2", borderWidth: 1.5, borderColor: colors.ink, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 1 }}>
                <Text style={{ fontSize: 9, fontWeight: "800", color: colors.error }}>ĐÃ KHÓA</Text>
              </View>
            )}
          </View>
          <Text style={{ fontSize: 12, color: colors.muted }}>{user.email}</Text>
        </View>
      </View>

      {/* Storage bar */}
      <View style={{ gap: 4 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ fontSize: 11, color: colors.muted }}>Dung lượng</Text>
          <Text style={{ fontSize: 11, color: colors.muted }}>
            {formatBytes(user.storageUsedBytes)} / {formatBytes(user.storageQuotaBytes)}
          </Text>
        </View>
        <View style={{ height: 6, borderWidth: 1.5, borderColor: colors.ink, borderRadius: 999, backgroundColor: "#F0F0F0", overflow: "hidden" }}>
          <View
            style={{
              width: `${Math.min((user.storageUsedBytes / user.storageQuotaBytes) * 100, 100)}%`,
              height: "100%",
              backgroundColor: colors.fptGreen,
            }}
          />
        </View>
      </View>

      {/* Toggle disable */}
      <Pressable
        onPress={onToggleDisable}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          paddingVertical: 8,
          borderWidth: 2,
          borderColor: user.isDisabled ? colors.fptGreen : colors.error,
          borderRadius: 10,
          backgroundColor: pressed ? "#F0F0F0" : "transparent",
          minHeight: 40,
        })}
        accessibilityRole="button"
        accessibilityLabel={user.isDisabled ? "Mở khóa tài khoản" : "Khóa tài khoản"}
      >
        <Ionicons
          name={user.isDisabled ? "checkmark-circle-outline" : "ban-outline"}
          size={16}
          color={user.isDisabled ? colors.fptGreen : colors.error}
        />
        <Text style={{ fontSize: 13, fontWeight: "700", color: user.isDisabled ? colors.fptGreen : colors.error }}>
          {user.isDisabled ? "Mở khóa tài khoản" : "Khóa tài khoản"}
        </Text>
      </Pressable>
    </View>
  );
}
