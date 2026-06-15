import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  Text,
  TextInput,
  View,
} from "react-native";

import { ChatBubble, ThinkingBubble } from "../../../components/app/chat/ChatBubble";
import { CitationStrip } from "../../../components/app/chat/CitationCard";
import { SkeletonList } from "../../../components/ui/SkeletonCard";
import { colors } from "../../../constants/colors";
import { type ChatMessage, useChatSession, useSendMessage } from "../../../hooks/useChat";

const CONTEXT_LABELS: Record<string, string> = {
  all: "Tất cả tài liệu",
  folder: "Thư mục",
  document: "Tài liệu",
};

export default function ChatSessionScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const router = useRouter();
  const { data: session, isLoading } = useChatSession(sessionId);
  const sendMessage = useSendMessage();

  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

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
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 3,
          borderBottomColor: colors.ink,
          backgroundColor: colors.surface,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => ({
            width: 36,
            height: 36,
            borderRadius: 10,
            borderWidth: 2,
            borderColor: colors.ink,
            backgroundColor: pressed ? "#F0F0F0" : colors.surface,
            alignItems: "center",
            justifyContent: "center",
          })}
          accessibilityLabel="Quay lại danh sách"
        >
          <Ionicons name="arrow-back" size={20} color={colors.ink} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: "800", color: colors.ink }} numberOfLines={1}>
            {session?.title ?? "Trò chuyện"}
          </Text>
          {session && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Ionicons name="layers-outline" size={11} color={colors.muted} />
              <Text style={{ fontSize: 11, color: colors.muted }}>
                {CONTEXT_LABELS[session.contextType] ?? session.contextType}
              </Text>
            </View>
          )}
        </View>
      </View>

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
            ListEmptyComponent={
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
            }
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

        {/* Input bar */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            gap: 10,
            paddingHorizontal: 14,
            paddingVertical: 12,
            borderTopWidth: 3,
            borderTopColor: colors.ink,
            backgroundColor: colors.surface,
          }}
        >
          <TextInput
            ref={inputRef}
            value={input}
            onChangeText={setInput}
            placeholder="Hỏi về tài liệu của bạn..."
            placeholderTextColor={colors.muted}
            multiline
            maxLength={2000}
            style={{
              flex: 1,
              borderWidth: 3,
              borderColor: colors.ink,
              borderRadius: 14,
              paddingHorizontal: 14,
              paddingTop: 10,
              paddingBottom: 10,
              fontSize: 15,
              color: colors.ink,
              backgroundColor: colors.bg,
              maxHeight: 120,
              minHeight: 46,
            }}
            returnKeyType="send"
            blurOnSubmit={false}
            onSubmitEditing={handleSend}
          />
          <Pressable
            onPress={handleSend}
            disabled={!input.trim() || isSending}
            style={({ pressed }) => ({
              width: 46,
              height: 46,
              borderRadius: 14,
              borderWidth: 3,
              borderColor: colors.ink,
              backgroundColor:
                !input.trim() || isSending ? "#E5E5E5" : colors.fptOrange,
              alignItems: "center",
              justifyContent: "center",
              shadowColor: colors.ink,
              shadowOffset: pressed || !input.trim() ? { width: 0, height: 0 } : { width: 3, height: 3 },
              shadowOpacity: pressed || !input.trim() ? 0 : 1,
              shadowRadius: 0,
              elevation: pressed || !input.trim() ? 0 : 3,
              transform: pressed && !!input.trim() ? [{ translateX: 3 }, { translateY: 3 }] : [],
            })}
            accessibilityLabel="Gửi tin nhắn"
            accessibilityRole="button"
          >
            <Ionicons
              name="arrow-up"
              size={22}
              color={!input.trim() || isSending ? colors.muted : colors.onBrand}
            />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
