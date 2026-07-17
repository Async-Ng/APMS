import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { colors } from "../../../constants/colors";
import { type ChatSession } from "../../../hooks/useChat";

const CONTEXT_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  all: "layers-outline",
  folder: "folder-outline",
  document: "document-text-outline",
  documents: "documents-outline",
};

const CONTEXT_LABELS: Record<string, string> = {
  all: "Tất cả tài liệu",
  folder: "Thư mục",
  document: "Tài liệu",
  documents: "Nhiều tài liệu",
};

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1) return "Vừa xong";
  if (m < 60) return `${m} phút trước`;
  if (h < 24) return `${h} giờ trước`;
  return `${d} ngày trước`;
}

function contextSummary(session: ChatSession): string | null {
  if (session.contextLabel) return session.contextLabel;
  if (session.contextDocuments?.length) {
    if (session.contextDocuments.length === 1) return session.contextDocuments[0]?.title ?? null;
    return `${session.contextDocuments[0]?.title ?? "Tài liệu"} + ${session.contextDocuments.length - 1} tài liệu`;
  }
  return null;
}

interface ChatSessionCardProps {
  session: ChatSession;
  onPress: () => void;
  onLongPress: () => void;
}

export function ChatSessionCard({ session, onPress, onLongPress }: ChatSessionCardProps) {
  const summary = contextSummary(session);

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
      style={({ pressed }) => ({
        backgroundColor: colors.surface,
        borderWidth: 3,
        borderColor: colors.ink,
        borderRadius: 16,
        padding: 16,
        gap: 8,
        shadowColor: colors.ink,
        shadowOffset: pressed ? { width: 0, height: 0 } : { width: 4, height: 4 },
        shadowOpacity: pressed ? 0 : 1,
        shadowRadius: 0,
        elevation: pressed ? 0 : 4,
        transform: pressed ? [{ translateX: 4 }, { translateY: 4 }] : [],
      })}
      accessibilityRole="button"
      accessibilityLabel={`Chat: ${session.title}`}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            borderWidth: 2,
            borderColor: colors.ink,
            backgroundColor: colors.fptBlue,
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Ionicons name={CONTEXT_ICONS[session.contextType] ?? "chatbubble-outline"} size={22} color={colors.onBrand} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            {session.isPinned && <Ionicons name="pin" size={14} color={colors.fptOrange} />}
            <Text style={{ flex: 1, fontSize: 15, fontWeight: "700", color: colors.ink }} numberOfLines={1}>
              {session.title}
            </Text>
          </View>
          {summary && (
            <Text style={{ marginTop: 3, fontSize: 12, fontWeight: "700", color: colors.muted }} numberOfLines={1}>
              {summary}
            </Text>
          )}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 5 }}>
            <View
              style={{
                backgroundColor:
                  session.contextType === "all" ? colors.fptGreen : session.contextType === "folder" ? colors.fptBlue : colors.fptOrange,
                borderWidth: 1.5,
                borderColor: colors.ink,
                borderRadius: 999,
                paddingHorizontal: 7,
                paddingVertical: 1,
              }}
            >
              <Text style={{ fontSize: 10, fontWeight: "700", color: colors.onBrand }}>
                {CONTEXT_LABELS[session.contextType] ?? "Tài liệu"}
              </Text>
            </View>
            <Text style={{ fontSize: 11, color: colors.muted }}>{formatRelativeTime(session.updatedAt)}</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </View>
    </Pressable>
  );
}
