import { Text, View } from "react-native";
import Markdown from "react-native-markdown-display";

import { colors } from "../../../constants/colors";

interface ChatBubbleProps {
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
}

const markdownStyles = {
  body: { fontSize: 15, color: colors.ink, lineHeight: 22 },
  paragraph: { marginTop: 0, marginBottom: 8 },
  strong: { fontWeight: "800" as const },
  em: { fontStyle: "italic" as const },
  bullet_list: { marginBottom: 4 },
  ordered_list: { marginBottom: 4 },
  list_item: { flexDirection: "row" as const, marginBottom: 4 },
  bullet_list_icon: { marginRight: 6, color: colors.fptOrange },
  ordered_list_icon: { marginRight: 6, color: colors.fptOrange, fontWeight: "700" as const },
  heading1: { fontSize: 19, fontWeight: "800" as const, color: colors.ink, marginTop: 4, marginBottom: 6 },
  heading2: { fontSize: 17, fontWeight: "800" as const, color: colors.ink, marginTop: 4, marginBottom: 6 },
  heading3: { fontSize: 16, fontWeight: "800" as const, color: colors.ink, marginTop: 4, marginBottom: 4 },
  code_inline: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 4,
    paddingHorizontal: 4,
    fontFamily: "monospace",
    fontSize: 13,
  },
  code_block: {
    backgroundColor: colors.bg,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: 10,
    padding: 10,
    fontFamily: "monospace",
    fontSize: 13,
  },
  fence: {
    backgroundColor: colors.bg,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: 10,
    padding: 10,
    fontFamily: "monospace",
    fontSize: 13,
  },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: colors.muted,
    paddingLeft: 10,
    opacity: 0.85,
  },
  link: { color: colors.fptBlue, textDecorationLine: "underline" as const },
  hr: { backgroundColor: "#E5E5E5", height: 1, marginVertical: 8 },
};

export function ChatBubble({ role, content, createdAt }: ChatBubbleProps) {
  const isUser = role === "user";

  return (
    <View
      style={{
        alignSelf: isUser ? "flex-end" : "flex-start",
        maxWidth: "85%",
        gap: 4,
        alignItems: isUser ? "flex-end" : "flex-start",
      }}
    >
      {!isUser && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            marginBottom: 2,
          }}
        >
          <View
            style={{
              width: 20,
              height: 20,
              borderRadius: 10,
              backgroundColor: colors.fptBlue,
              borderWidth: 1.5,
              borderColor: colors.ink,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 8, fontWeight: "800", color: colors.onBrand }}>AI</Text>
          </View>
          <Text style={{ fontSize: 11, fontWeight: "700", color: colors.muted }}>APMS Assistant</Text>
        </View>
      )}
      <View
        style={{
          backgroundColor: isUser ? colors.fptBlue : colors.surface,
          borderWidth: 2.5,
          borderColor: colors.ink,
          borderRadius: isUser ? 18 : 18,
          borderBottomRightRadius: isUser ? 4 : 18,
          borderBottomLeftRadius: isUser ? 18 : 4,
          paddingHorizontal: 14,
          paddingVertical: 10,
          shadowColor: colors.ink,
          shadowOffset: { width: 3, height: 3 },
          shadowOpacity: 1,
          shadowRadius: 0,
          elevation: 3,
        }}
      >
        {isUser ? (
          <Text style={{ fontSize: 15, color: colors.onBrand, lineHeight: 22 }}>{content}</Text>
        ) : (
          <Markdown style={markdownStyles}>{content}</Markdown>
        )}
      </View>
      {createdAt && (
        <Text style={{ fontSize: 10, color: colors.muted }}>
          {new Date(createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </Text>
      )}
    </View>
  );
}

export function ThinkingBubble() {
  return (
    <View style={{ alignSelf: "flex-start", maxWidth: "85%" }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          marginBottom: 2,
        }}
      >
        <View
          style={{
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: colors.fptBlue,
            borderWidth: 1.5,
            borderColor: colors.ink,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 8, fontWeight: "800", color: colors.onBrand }}>AI</Text>
        </View>
        <Text style={{ fontSize: 11, fontWeight: "700", color: colors.muted }}>APMS Assistant</Text>
      </View>
      <View
        style={{
          backgroundColor: colors.surface,
          borderWidth: 2.5,
          borderColor: colors.ink,
          borderRadius: 18,
          borderBottomLeftRadius: 4,
          paddingHorizontal: 16,
          paddingVertical: 12,
          shadowColor: colors.ink,
          shadowOffset: { width: 3, height: 3 },
          shadowOpacity: 1,
          shadowRadius: 0,
          elevation: 3,
        }}
      >
        <View style={{ flexDirection: "row", gap: 5, alignItems: "center" }}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: colors.fptBlue,
                opacity: 0.6 + i * 0.2,
              }}
            />
          ))}
        </View>
      </View>
    </View>
  );
}
