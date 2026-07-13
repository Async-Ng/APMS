import { Text, View } from "react-native";

import { colors } from "../../constants/colors";
import { formatElapsed, useElapsedSeconds } from "../../hooks/useElapsedSeconds";

type Status = "pending" | "processing" | "ready" | "failed" | "shared" | "starred";

const statusConfig: Record<Status, { label: string; bg: string; text: string }> = {
  pending:    { label: "Chờ xử lý",   bg: "#FEF3C7", text: "#92400E" },
  processing: { label: "Đang xử lý",  bg: "#DBEAFE", text: "#1E40AF" },
  ready:      { label: "Sẵn sàng",    bg: "#D1FAE5", text: "#065F46" },
  failed:     { label: "Lỗi",         bg: "#FEE2E2", text: "#991B1B" },
  shared:     { label: "Đã chia sẻ",  bg: "#EDE9FE", text: "#5B21B6" },
  starred:    { label: "Đã gắn sao",  bg: "#FEF9C3", text: "#713F12" },
};

export function StatusBadge({ status, createdAt }: { status: Status; createdAt?: string }) {
  const cfg = statusConfig[status];
  const isProcessing = status === "pending" || status === "processing";
  const elapsed = useElapsedSeconds(createdAt ?? new Date().toISOString());

  return (
    <View
      style={{
        alignSelf: "flex-start",
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: cfg.bg,
        borderWidth: 1.5,
        borderColor: colors.ink,
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 2,
      }}
    >
      <Text style={{ fontSize: 10, fontWeight: "700", color: cfg.text }}>{cfg.label}</Text>
      {createdAt && isProcessing && (
        <Text style={{ fontSize: 10, fontWeight: "600", color: cfg.text, opacity: 0.7, marginLeft: 4 }}>
          ({formatElapsed(elapsed)})
        </Text>
      )}
    </View>
  );
}
