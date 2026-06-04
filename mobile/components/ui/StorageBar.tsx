import { Text, View, type ViewStyle } from "react-native";

import { colors } from "../../constants/colors";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

interface StorageBarProps {
  usedBytes: number;
  quotaBytes: number;
  style?: ViewStyle;
}

export function StorageBar({ usedBytes, quotaBytes, style }: StorageBarProps) {
  const pct = quotaBytes > 0 ? Math.min((usedBytes / quotaBytes) * 100, 100) : 0;
  const barColor = pct > 90 ? colors.error : pct > 70 ? colors.fptOrange : colors.fptGreen;

  return (
    <View style={{ gap: 8, ...style }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 13, fontWeight: "700", color: colors.ink }}>Storage</Text>
        <Text style={{ fontSize: 12, color: colors.muted }}>
          {formatBytes(usedBytes)} / {formatBytes(quotaBytes)}
        </Text>
      </View>
      <View
        style={{
          height: 12,
          borderWidth: 2,
          borderColor: colors.ink,
          borderRadius: 999,
          backgroundColor: colors.surface,
          overflow: "hidden",
        }}
      >
        <View style={{ width: `${pct}%`, height: "100%", backgroundColor: barColor, borderRadius: 999 }} />
      </View>
      <Text style={{ fontSize: 11, color: colors.muted }}>{pct.toFixed(0)}% used</Text>
    </View>
  );
}
