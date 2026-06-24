import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, SafeAreaView, Text, View } from "react-native";

import { ChatBubble, ThinkingBubble } from "../../../components/app/chat/ChatBubble";
import { ChatInputBar } from "../../../components/app/chat/ChatInputBar";
import { CitationStrip } from "../../../components/app/chat/CitationCard";
import { RenameChatModal } from "../../../components/app/chat/RenameChatModal";
import { ActionSheet } from "../../../components/app/ActionSheet";
import { HeaderBar, HeaderIconButton } from "../../../components/ui/HeaderBar";
import { SkeletonList } from "../../../components/ui/SkeletonCard";
import { colors } from "../../../constants/colors";
import {
  type ChatMessage,
  useChatSession,
  useSendMessage,
  useUpdateChatSession,
} from "../../../hooks/useChat";

const CONTEXT_LABELS: Record<string, string> = {
  all: "Tất cả tài liệu",
  folder: "Thư mục",
  document: "Tài liệu",
  documents: "Nhiều tài liệu",
};

export default function ChatSessionScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const router = useRouter();
  const { data: session, isLoading } = useChatSession(sessionId);
  const sendMessage = useSendMessage();
  const updateSession = useUpdateChatSession();

  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const messages = session?.messages ?? [];

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  async function handleSend() {
    const content = input.trim();
    if (!content || isSending) return;

    setInput("");
    setIsSending(true);

    try {
      await sendMessage.mutateAsync({ sessionId, content });
    } finally {
      setIsSending(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 150);
    }
  }

  type ListItem =
    | { type: "message"; key: string; data: ChatMessage }
    | { type: "thinking"; key: string };

  const listItems: ListItem[] = [
    ...messages.map((m) => ({ type: "message" as const, key: m.id, data: m })),
    ...(isSending ? [{ type: "thinking" as const, key: "thinking" }] : []),
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <HeaderBar
        title={session?.title ?? "Trò chuyện"}
        onBack={() => router.back()}
        subtitle={session ? (CONTEXT_LABELS[session.contextType] ?? session.contextType) : undefined}
        right={<HeaderIconButton icon="ellipsis-vertical" accessibilityLabel="Tùy chọn cuộc trò chuyện" onPress={() => setMenuOpen(true)} />}
      />

      <RenameChatModal
        visible={renameOpen}
        initialTitle={session?.title ?? ""}
        loading={updateSession.isPending}
        onDismiss={() => setRenameOpen(false)}
        onConfirm={(title) => {
          updateSession.mutate(
            { sessionId, body: { title } },
            { onSuccess: () => setRenameOpen(false) },
          );
        }}
      />

      <ActionSheet
        visible={menuOpen}
        title={session?.title ?? "Trò chuyện"}
        subtitle="Phiên trò chuyện"
        actions={[
          {
            label: "Đổi tên",
            icon: "pencil-outline",
            onPress: () => {
              setMenuOpen(false);
              setRenameOpen(true);
            },
          },
          {
            label: session?.isPinned ? "Bỏ ghim" : "Ghim cuộc trò chuyện",
            icon: session?.isPinned ? "pin-outline" : "pin",
            onPress: () => {
              if (session) {
                updateSession.mutate({
                  sessionId,
                  body: { isPinned: !session.isPinned },
                });
              }
            },
          },
        ]}
        onDismiss={() => setMenuOpen(false)}
      />

      {/* Messages */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        {isLoading ? (
          <View style={{ padding: 16 }}>
            <SkeletonList count={3} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={listItems}
            keyExtractor={(item) => item.key}
            contentContainerStyle={{
              padding: 16,
              gap: 16,
              paddingBottom: 20,
              flexGrow: 1,
            }}
            ListEmptyComponent={<ChatEmptyState />}
            renderItem={({ item }) => {
              if (item.type === "thinking") return <ThinkingBubble />;
              const msg = item.data;
              return (
                <View style={{ gap: 10 }}>
                  <ChatBubble role={msg.role} content={msg.content} createdAt={msg.createdAt} />
                  {msg.role === "assistant" && msg.citations.length > 0 && (
                    <CitationStrip
                      citations={msg.citations}
                      onPress={(docId) => router.push(`/documents/${docId}`)}
                    />
                  )}
                </View>
              );
            }}
          />
        )}

        <ChatInputBar value={input} onChangeText={setInput} onSend={handleSend} sending={isSending} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ChatEmptyState() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 60 }}>
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          borderWidth: 3,
          borderColor: colors.ink,
          backgroundColor: colors.fptBlue,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: colors.ink,
          shadowOffset: { width: 4, height: 4 },
          shadowOpacity: 1,
          shadowRadius: 0,
          elevation: 4,
          marginBottom: 16,
        }}
      >
        <Ionicons name="chatbubble-ellipses" size={28} color={colors.onBrand} />
      </View>
      <Text style={{ fontSize: 18, fontWeight: "800", color: colors.ink, textAlign: "center" }}>
        Bắt đầu cuộc trò chuyện
      </Text>
      <Text style={{ fontSize: 13, color: colors.muted, textAlign: "center", marginTop: 6, lineHeight: 18, paddingHorizontal: 20 }}>
        Hỏi bất cứ điều gì về tài liệu của bạn. Mọi câu trả lời đều dựa trên tài liệu của bạn.
      </Text>
    </View>
  );
}
