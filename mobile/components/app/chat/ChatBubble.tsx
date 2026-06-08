import { Text, View } from "react-native";

import { colors } from "../../../constants/colors";

interface ChatBubbleProps {
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
}

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
        <Text
          style={{
            fontSize: 15,
            color: isUser ? colors.onBrand : colors.ink,
            lineHeight: 22,
          }}
        >
          {content}
        </Text>
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
