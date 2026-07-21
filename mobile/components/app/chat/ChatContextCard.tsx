import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { colors } from "../../../constants/colors";
import { type ChatSession } from "../../../hooks/useChat";

const CONTEXT_ICONS: Record<ChatSession["contextType"], keyof typeof Ionicons.glyphMap> = {
  all: "layers-outline",
  folder: "folder-outline",
  document: "document-text-outline",
  documents: "documents-outline",
};

function contextTypeLabel(type: ChatSession["contextType"]): string {
  if (type === "all") return "Toàn bộ tài liệu";
  if (type === "folder") return "Một thư mục";
  if (type === "documents") return "Nhiều tài liệu";
  return "Một tài liệu";
}

function contextTitle(session: ChatSession): string {
  if (session.contextType === "all") return "Mọi tài liệu bạn có quyền đọc";
  if (session.contextLabel) return session.contextLabel;
  if (session.contextDocuments?.length) {
    if (session.contextDocuments.length === 1) return session.contextDocuments[0]?.title ?? "Tài liệu";
    return `${session.contextDocuments[0]?.title ?? "Tài liệu"} + ${session.contextDocuments.length - 1} tài liệu`;
  }
  return contextTypeLabel(session.contextType);
}

export function ChatContextCard({
  session,
  processing,
  onOpenDocument,
}: {
  session: ChatSession;
  processing?: boolean;
  onOpenDocument?: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const docs = session.contextDocuments ?? [];
  const canExpand = session.contextType === "documents" && docs.length > 0;

  return (
    <View
      style={{
        marginHorizontal: 16,
        marginTop: 12,
        borderWidth: 3,
        borderColor: colors.ink,
        borderRadius: 14,
        backgroundColor: colors.surface,
        overflow: "hidden",
      }}
    >
      <Pressable
        onPress={() => canExpand && setExpanded((value) => !value)}
        disabled={!canExpand}
        style={({ pressed }) => ({
          minHeight: 64,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          padding: 12,
          backgroundColor: pressed ? "#F0F0F0" : colors.surface,
        })}
        accessibilityRole={canExpand ? "button" : undefined}
        accessibilityState={canExpand ? { expanded } : undefined}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            borderWidth: 2,
            borderColor: colors.ink,
            backgroundColor: colors.fptBlue,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name={CONTEXT_ICONS[session.contextType]} size={20} color={colors.onBrand} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, fontWeight: "800", color: colors.muted }}>
            {contextTypeLabel(session.contextType)}
          </Text>
          <Text style={{ fontSize: 14, fontWeight: "800", color: colors.ink, marginTop: 2 }} numberOfLines={2}>
            {contextTitle(session)}
          </Text>
        </View>
        {canExpand && <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={18} color={colors.muted} />}
      </Pressable>

      {processing && (
        <View style={{ borderTopWidth: 2, borderTopColor: colors.ink, backgroundColor: "#FEF3C7", padding: 10 }}>
          <Text style={{ fontSize: 12, lineHeight: 17, fontWeight: "700", color: "#92400E" }}>
            Một số tài liệu đang được xử lý. Câu trả lời có thể chưa đầy đủ cho đến khi xử lý xong.
          </Text>
        </View>
      )}

      {expanded && (
        <View style={{ borderTopWidth: 2, borderTopColor: colors.ink, padding: 8, gap: 6 }}>
          {docs.map((doc, index) => (
            <Pressable
              key={doc.id}
              onPress={() => onOpenDocument?.(doc.id)}
              style={({ pressed }) => ({
                minHeight: 44,
                borderRadius: 10,
                paddingHorizontal: 10,
                backgroundColor: pressed ? "#F0F0F0" : colors.bg,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              })}
              accessibilityRole="button"
              accessibilityLabel={`Mở tài liệu ${doc.title}`}
            >
              <Text style={{ width: 22, fontSize: 11, fontWeight: "800", color: colors.fptBlue }}>
                {index + 1}
              </Text>
              <Ionicons name="document-text-outline" size={16} color={colors.fptBlue} />
              <Text style={{ flex: 1, fontSize: 13, fontWeight: "700", color: colors.ink }} numberOfLines={2}>
                {doc.title}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
