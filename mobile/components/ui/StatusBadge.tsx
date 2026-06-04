import { Text, View } from "react-native";

import { colors } from "../../constants/colors";

type Status = "pending" | "processing" | "ready" | "failed" | "shared" | "starred";

const statusConfig: Record<Status, { label: string; bg: string; text: string }> = {
  pending:    { label: "Pending",    bg: "#FEF3C7", text: "#92400E" },
  processing: { label: "Processing", bg: "#DBEAFE", text: "#1E40AF" },
  ready:      { label: "Ready",      bg: "#D1FAE5", text: "#065F46" },
  failed:     { label: "Failed",     bg: "#FEE2E2", text: "#991B1B" },
  shared:     { label: "Shared",     bg: "#EDE9FE", text: "#5B21B6" },
  starred:    { label: "Starred",    bg: "#FEF9C3", text: "#713F12" },
};

export function StatusBadge({ status }: { status: Status }) {
  const cfg = statusConfig[status];
  return (
    <View
      style={{
        alignSelf: "flex-start",
        backgroundColor: cfg.bg,
        borderWidth: 1.5,
        borderColor: colors.ink,
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 2,
      }}
    >
      <Text style={{ fontSize: 10, fontWeight: "700", color: cfg.text }}>{cfg.label}</Text>
    </View>
  );
}
