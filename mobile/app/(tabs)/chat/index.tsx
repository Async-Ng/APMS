import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  Text,
  View,
} from "react-native";

import { ActionSheet } from "../../../components/app/ActionSheet";
import { EmptyState } from "../../../components/ui/EmptyState";
import { SkeletonList } from "../../../components/ui/SkeletonCard";
import { colors } from "../../../constants/colors";
import { brutalCtaStyle, pressedBrutalStyle } from "../../../lib/brutal-style";
import { type ChatSession, useChatSessions, useCreateChatSession, useDeleteChatSession } from "../../../hooks/useChat";

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

const CONTEXT_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  all: "layers-outline",
  folder: "folder-outline",
  document: "document-text-outline",
};

export default function ChatSessionsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ contextType?: string; contextId?: string; contextName?: string }>();

  const { data: sessions, isLoading, refetch, isRefetching } = useChatSessions();
  const createSession = useCreateChatSession();
  const deleteSession = useDeleteChatSession();

  const [actionTarget, setActionTarget] = useState<ChatSession | null>(null);

  useEffect(() => {
    if (params.contextType && params.contextId) {
      createSession.mutate(
        {
          contextType: params.contextType as "all" | "folder" | "document",
          contextId: params.contextId,
          title: params.contextName ? `Chat: ${params.contextName}` : undefined,
        },
        {
          onSuccess: (session) => {
            router.push(`/(tabs)/chat/${session.id}`);
          },
        },
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleNewChat() {
    createSession.mutate(
      { contextType: "all", title: "Cuộc trò chuyện mới" },
      { onSuccess: (session) => router.push(`/(tabs)/chat/${session.id}`) },
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 3,
          borderBottomColor: colors.ink,
          backgroundColor: colors.surface,
        }}
      >
        <View>
          <Text style={{ fontSize: 24, fontWeight: "800", color: colors.ink }}>Trò chuyện AI</Text>
          <Text style={{ fontSize: 12, color: colors.muted }}>Hỏi đáp về tài liệu của bạn</Text>
        </View>
        <Pressable
          onPress={handleNewChat}
          disabled={createSession.isPending}
          style={({ pressed }) => ({
            ...brutalCtaStyle,
            backgroundColor: colors.fptOrange,
            paddingHorizontal: 14,
            paddingVertical: 8,
            minHeight: 40,
            flexDirection: "row",
            gap: 6,
            ...pressedBrutalStyle(pressed),
          })}
          accessibilityLabel="Trò chuyện mới"
        >
          <Ionicons name="add" size={16} color={colors.onBrand} />
          <Text style={{ color: colors.onBrand, fontWeight: "700", fontSize: 13 }}>Trò chuyện mới</Text>
        </Pressable>
      </View>

      {/* Sessions list */}
      {isLoading ? (
        <View style={{ padding: 16 }}>
          <SkeletonList count={3} />
        </View>
      ) : (
        <FlatList
          data={sessions ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={colors.fptBlue} />
          }
          ListEmptyComponent={
            <EmptyState
              icon="chatbubble-outline"
              title="Chưa có cuộc trò chuyện"
              description="Bắt đầu trò chuyện mới và hỏi bất cứ điều gì về tài liệu của bạn."
              action={{ label: "Bắt đầu trò chuyện", onPress: handleNewChat }}
            />
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/(tabs)/chat/${item.id}`)}
              onLongPress={() => setActionTarget(item)}
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
              accessibilityLabel={`Chat: ${item.title}`}
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
                  <Ionicons
                    name={CONTEXT_ICONS[item.contextType] ?? "chatbubble-outline"}
                    size={22}
                    color={colors.onBrand}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: colors.ink }} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 }}>
                    <View
                      style={{
                        backgroundColor:
                          item.contextType === "all" ? colors.fptGreen : item.contextType === "folder" ? colors.fptBlue : colors.fptOrange,
                        borderWidth: 1.5,
                        borderColor: colors.ink,
                        borderRadius: 999,
                        paddingHorizontal: 7,
                        paddingVertical: 1,
                      }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: "700", color: colors.onBrand }}>
                        {item.contextType === "all" ? "Tất cả tài liệu" : item.contextType === "folder" ? "Thư mục" : "Tài liệu"}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 11, color: colors.muted }}>{formatRelativeTime(item.updatedAt)}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              </View>
            </Pressable>
          )}
        />
      )}

      <ActionSheet
        visible={actionTarget !== null}
        title={actionTarget?.title ?? ""}
        subtitle="Phiên trò chuyện"
        actions={[
          {
            label: "Xóa cuộc trò chuyện",
            icon: "trash-outline",
            destructive: true,
            onPress: () => {
              if (actionTarget) deleteSession.mutate(actionTarget.id);
            },
          },
        ]}
        onDismiss={() => setActionTarget(null)}
      />
    </SafeAreaView>
  );
}
