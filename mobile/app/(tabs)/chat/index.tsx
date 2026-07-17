import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, FlatList, Pressable, RefreshControl, SafeAreaView, Text } from "react-native";

import { ActionSheet } from "../../../components/app/ActionSheet";
import { ChatSessionCard } from "../../../components/app/chat/ChatSessionCard";
import { ChatSourcePickerSheet } from "../../../components/app/chat/ChatSourcePickerSheet";
import { RenameChatModal } from "../../../components/app/chat/RenameChatModal";
import { EmptyState } from "../../../components/ui/EmptyState";
import { HeaderBar } from "../../../components/ui/HeaderBar";
import { SkeletonList } from "../../../components/ui/SkeletonCard";
import { colors } from "../../../constants/colors";
import { brutalCtaStyle, pressedBrutalStyle } from "../../../lib/brutal-style";
import {
  type ChatSession,
  useChatSessions,
  useCreateChatSession,
  useDeleteChatSession,
  useUpdateChatSession,
} from "../../../hooks/useChat";

export default function ChatSessionsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ contextType?: string; contextId?: string; contextName?: string }>();

  const { data: sessions, isLoading, refetch, isRefetching } = useChatSessions();
  const createSession = useCreateChatSession();
  const deleteSession = useDeleteChatSession();
  const updateSession = useUpdateChatSession();

  const [actionTarget, setActionTarget] = useState<ChatSession | null>(null);
  const [renameTarget, setRenameTarget] = useState<ChatSession | null>(null);
  const [sourcePickerOpen, setSourcePickerOpen] = useState(false);

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
    setSourcePickerOpen(true);
  }

  function confirmDeleteSession(session: ChatSession) {
    Alert.alert("Xóa cuộc trò chuyện?", `Cuộc trò chuyện "${session.title}" sẽ bị xóa khỏi danh sách.`, [
      { text: "Huỷ", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: () => {
          deleteSession.mutate(session.id, { onSuccess: () => setActionTarget(null) });
        },
      },
    ]);
  }

  function handleRenameConfirm(title: string) {
    if (!renameTarget) return;
    updateSession.mutate(
      { sessionId: renameTarget.id, body: { title } },
      {
        onSuccess: () => {
          setRenameTarget(null);
          setActionTarget(null);
        },
      },
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <HeaderBar
        title="Trò chuyện AI"
        subtitle="Hỏi đáp về tài liệu của bạn"
        right={
          <Pressable
            onPress={handleNewChat}
            disabled={createSession.isPending}
            style={({ pressed }) => ({
              ...brutalCtaStyle,
              backgroundColor: colors.fptOrange,
              paddingHorizontal: 14,
              paddingVertical: 8,
              minHeight: 44,
              flexDirection: "row",
              gap: 6,
              ...pressedBrutalStyle(pressed),
            })}
            accessibilityLabel="Chọn nguồn chat"
          >
            <Ionicons name="folder-open-outline" size={16} color={colors.onBrand} />
            <Text style={{ color: colors.onBrand, fontWeight: "700", fontSize: 13 }}>Chọn nguồn</Text>
          </Pressable>
        }
      />

      {/* Sessions list */}
      {isLoading ? (
        <SkeletonList count={3} />
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
              description="Chọn nguồn tài liệu rồi hỏi AI, tóm tắt, tạo FAQ hoặc ôn tập."
              action={{ label: "Chọn nguồn chat", onPress: handleNewChat }}
            />
          }
          renderItem={({ item }) => (
            <ChatSessionCard
              session={item}
              onPress={() => router.push(`/(tabs)/chat/${item.id}`)}
              onLongPress={() => setActionTarget(item)}
            />
          )}
        />
      )}

      <RenameChatModal
        visible={renameTarget !== null}
        initialTitle={renameTarget?.title ?? ""}
        loading={updateSession.isPending}
        onDismiss={() => setRenameTarget(null)}
        onConfirm={handleRenameConfirm}
      />

      <ActionSheet
        visible={actionTarget !== null}
        title={actionTarget?.title ?? ""}
        subtitle="Phiên trò chuyện"
        actions={[
          {
            label: "Đổi tên",
            icon: "pencil-outline",
            onPress: () => {
              if (actionTarget) {
                setRenameTarget(actionTarget);
              }
            },
          },
          {
            label: actionTarget?.isPinned ? "Bỏ ghim" : "Ghim cuộc trò chuyện",
            icon: actionTarget?.isPinned ? "pin-outline" : "pin",
            onPress: () => {
              if (actionTarget) {
                updateSession.mutate({
                  sessionId: actionTarget.id,
                  body: { isPinned: !actionTarget.isPinned },
                });
              }
            },
          },
          {
            label: "Xóa cuộc trò chuyện",
            icon: "trash-outline",
            destructive: true,
            onPress: () => {
              if (actionTarget) confirmDeleteSession(actionTarget);
            },
          },
        ]}
        onDismiss={() => setActionTarget(null)}
      />
      <ChatSourcePickerSheet
        visible={sourcePickerOpen}
        loading={createSession.isPending}
        onDismiss={() => setSourcePickerOpen(false)}
        onCreate={(input) => {
          createSession.mutate(input, {
            onSuccess: (session) => {
              setSourcePickerOpen(false);
              router.push(`/(tabs)/chat/${session.id}`);
            },
          });
        }}
      />
    </SafeAreaView>
  );
}
