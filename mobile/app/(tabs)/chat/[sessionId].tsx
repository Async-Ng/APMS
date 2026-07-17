import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, Text, View } from "react-native";

import { ActionSheet } from "../../../components/app/ActionSheet";
import { ChatBubble, ThinkingBubble } from "../../../components/app/chat/ChatBubble";
import { ChatContextCard } from "../../../components/app/chat/ChatContextCard";
import { ChatInputBar } from "../../../components/app/chat/ChatInputBar";
import { CitationStrip } from "../../../components/app/chat/CitationCard";
import { RenameChatModal } from "../../../components/app/chat/RenameChatModal";
import { HeaderBar, HeaderIconButton } from "../../../components/ui/HeaderBar";
import { SkeletonList } from "../../../components/ui/SkeletonCard";
import { colors } from "../../../constants/colors";
import { getErrorMessage } from "../../../lib/api-error";
import {
  CHAT_PRESET_CONTENT,
  type ChatMessage,
  type ChatMode,
  type Citation,
  useChatContextStatus,
  useChatSession,
  useDeleteChatSession,
  useSendMessage,
  useUpdateChatSession,
} from "../../../hooks/useChat";

const CONTEXT_LABELS: Record<string, string> = {
  all: "Tất cả tài liệu",
  folder: "Thư mục",
  document: "Tài liệu",
  documents: "Nhiều tài liệu",
};

type PresetMode = Exclude<ChatMode, "chat">;
type RetryMessage = { content: string; mode: ChatMode } | null;

export default function ChatSessionScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const router = useRouter();
  const { data: session, isLoading } = useChatSession(sessionId);
  const sendMessage = useSendMessage();
  const updateSession = useUpdateChatSession();
  const deleteSession = useDeleteChatSession();

  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [retryMessage, setRetryMessage] = useState<RetryMessage>(null);
  const flatListRef = useRef<FlatList>(null);

  const messages = session?.messages ?? [];
  const contextDocumentIds = useMemo(() => {
    if (!session) return [];
    if (session.contextType === "document" && session.contextId) return [session.contextId];
    if (session.contextType === "documents") {
      return session.contextIds?.length
        ? session.contextIds
        : (session.contextDocuments ?? []).map((doc) => doc.id);
    }
    return [];
  }, [session]);
  const { data: contextStatuses = [] } = useChatContextStatus(contextDocumentIds);
  const contextProcessing = contextStatuses.some((doc) => doc.status === "pending" || doc.status === "processing");

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  async function submitMessage({ content, mode = "chat" }: { content: string; mode?: ChatMode }) {
    const trimmed = content.trim();
    if (!trimmed || isSending) return;

    if (mode === "chat") setInput("");
    setSendError(null);
    setRetryMessage({ content: trimmed, mode });
    setIsSending(true);

    try {
      await sendMessage.mutateAsync({ sessionId, content: trimmed, mode });
      setRetryMessage(null);
    } catch (err) {
      setSendError(getErrorMessage(err, "Gửi tin nhắn thất bại. Vui lòng thử lại."));
    } finally {
      setIsSending(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 150);
    }
  }

  function handleSend() {
    void submitMessage({ content: input, mode: "chat" });
  }

  function handleSendPreset(mode: PresetMode) {
    void submitMessage({ content: CHAT_PRESET_CONTENT[mode], mode });
  }

  function handleRetry() {
    if (!retryMessage) return;
    void submitMessage(retryMessage);
  }

  function openCitation(citation: Citation) {
    if (citation.deepLink) {
      router.push(citation.deepLink as never);
      return;
    }
    router.push(`/documents/${citation.documentId}`);
  }

  function confirmDeleteSession() {
    if (!session) return;
    setMenuOpen(false);
    Alert.alert("Xoá cuộc trò chuyện?", `Cuộc trò chuyện "${session.title}" sẽ bị xoá khỏi danh sách của bạn.`, [
      { text: "Huỷ", style: "cancel" },
      {
        text: "Xoá",
        style: "destructive",
        onPress: () => {
          deleteSession.mutate(sessionId, {
            onSuccess: () => router.back(),
          });
        },
      },
    ]);
  }

  type ListItem =
    | { type: "message"; key: string; data: ChatMessage }
    | { type: "thinking"; key: string };

  const listItems: ListItem[] = messages.map((m) =>
    m.role === "assistant" && m.id.startsWith("streaming-") && m.content === ""
      ? { type: "thinking" as const, key: m.id }
      : { type: "message" as const, key: m.id, data: m },
  );

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
              setMenuOpen(false);
              if (session) {
                updateSession.mutate({
                  sessionId,
                  body: { isPinned: !session.isPinned },
                });
              }
            },
          },
          {
            label: "Xoá cuộc trò chuyện",
            icon: "trash-outline",
            destructive: true,
            onPress: confirmDeleteSession,
          },
        ]}
        onDismiss={() => setMenuOpen(false)}
      />

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
          <>
            {session && (
              <ChatContextCard
                session={session}
                processing={contextProcessing}
                onOpenDocument={(id) => router.push(`/documents/${id}`)}
              />
            )}
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
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                if (item.type === "thinking") return <ThinkingBubble />;
                const msg = item.data;
                return (
                  <View style={{ gap: 10 }}>
                    <ChatBubble
                      role={msg.role}
                      content={msg.content}
                      createdAt={msg.createdAt}
                      citations={msg.citations}
                      onCitationPress={openCitation}
                    />
                    {msg.role === "assistant" && msg.citations.length > 0 && (
                      <CitationStrip citations={msg.citations} onPress={openCitation} />
                    )}
                    {msg.role === "assistant" && (msg.suggestedQuestions?.length ?? 0) > 0 && (
                      <SuggestedQuestions
                        questions={msg.suggestedQuestions ?? []}
                        disabled={isSending}
                        onPress={(question) => void submitMessage({ content: question, mode: "chat" })}
                      />
                    )}
                  </View>
                );
              }}
            />
          </>
        )}

        {sendError && (
          <View
            style={{
              marginHorizontal: 14,
              marginBottom: 10,
              borderWidth: 2,
              borderColor: "#B91C1C",
              borderRadius: 12,
              backgroundColor: "#FEF2F2",
              padding: 10,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Ionicons name="alert-circle-outline" size={18} color="#B91C1C" />
            <Text style={{ flex: 1, fontSize: 12, fontWeight: "700", color: "#7F1D1D" }}>{sendError}</Text>
            <Pressable
              onPress={handleRetry}
              disabled={!retryMessage || isSending}
              style={({ pressed }) => ({
                minHeight: 36,
                borderWidth: 2,
                borderColor: colors.ink,
                borderRadius: 10,
                paddingHorizontal: 10,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: pressed ? "#F0F0F0" : colors.surface,
                opacity: !retryMessage || isSending ? 0.55 : 1,
              })}
              accessibilityRole="button"
              accessibilityLabel="Thử gửi lại"
            >
              <Text style={{ fontSize: 12, fontWeight: "800", color: colors.ink }}>Thử lại</Text>
            </Pressable>
          </View>
        )}

        <ChatInputBar
          value={input}
          onChangeText={setInput}
          onSend={handleSend}
          onSendPreset={handleSendPreset}
          sending={isSending}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SuggestedQuestions({
  questions,
  disabled,
  onPress,
}: {
  questions: string[];
  disabled: boolean;
  onPress: (question: string) => void;
}) {
  return (
    <View style={{ gap: 8, alignItems: "flex-start" }}>
      <Text style={{ fontSize: 11, fontWeight: "800", color: colors.muted }}>Câu hỏi tiếp theo</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {questions.slice(0, 4).map((question) => (
          <Pressable
            key={question}
            onPress={() => onPress(question)}
            disabled={disabled}
            style={({ pressed }) => ({
              minHeight: 40,
              maxWidth: "100%",
              borderWidth: 2,
              borderColor: colors.ink,
              borderRadius: 999,
              paddingHorizontal: 12,
              justifyContent: "center",
              backgroundColor: pressed ? "#F0F0F0" : colors.surface,
              opacity: disabled ? 0.55 : 1,
            })}
            accessibilityRole="button"
            accessibilityLabel={`Gửi câu hỏi: ${question}`}
          >
            <Text style={{ maxWidth: 280, fontSize: 12, fontWeight: "700", color: colors.ink }} numberOfLines={2}>
              {question}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
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
        Hỏi bất cứ điều gì về tài liệu của bạn. Mỗi câu trả lời đều dựa trên phạm vi tài liệu đã chọn.
      </Text>
    </View>
  );
}
