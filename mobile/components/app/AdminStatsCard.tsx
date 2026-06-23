import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { colors } from "../../constants/colors";
import { brutalCardStyle } from "../../lib/brutal-style";

export interface AdminStats {
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

export function AdminStatsCard({ stats }: { stats: AdminStats }) {
  const rows: { label: string; value: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { label: "Tổng người dùng", value: String(stats.totalUsers), icon: "people-outline" },
    { label: "Người dùng hoạt động", value: String(stats.activeUsers), icon: "person-outline" },
    { label: "Tổng tài liệu", value: String(stats.totalDocuments), icon: "documents-outline" },
    { label: "Tổng thư mục", value: String(stats.totalFolders), icon: "folder-outline" },
    { label: "Dung lượng đã dùng", value: formatBytes(stats.totalStorageUsedBytes), icon: "server-outline" },
  ];

  return (
    <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
      <Text style={{ fontSize: 13, fontWeight: "800", color: colors.muted, marginBottom: 10 }}>
        THỐNG KÊ HỆ THỐNG
      </Text>
      <View style={{ ...brutalCardStyle, padding: 16, gap: 0 }}>
        {rows.map((row, idx, arr) => (
          <View
            key={row.label}
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
              <Ionicons name={row.icon} size={16} color={colors.muted} />
              <Text style={{ fontSize: 14, color: colors.muted }}>{row.label}</Text>
            </View>
            <Text style={{ fontSize: 14, fontWeight: "800", color: colors.ink }}>{row.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
