import { Ionicons } from "@expo/vector-icons";
import { useRef } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { colors } from "../../../constants/colors";
import { type ChatMode } from "../../../hooks/useChat";

interface ChatInputBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  sending: boolean;
  mode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
}

const MODE_OPTIONS: { value: ChatMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: "chat", label: "Hỏi đáp", icon: "chatbubble-outline" },
  { value: "summary", label: "Tóm tắt", icon: "reader-outline" },
  { value: "faq", label: "FAQ", icon: "help-circle-outline" },
  { value: "study_guide", label: "Ôn tập", icon: "school-outline" },
];

export function ChatInputBar({ value, onChangeText, onSend, sending, mode, onModeChange }: ChatInputBarProps) {
  const inputRef = useRef<TextInput>(null);
  const canSend = (mode === "chat" ? value.trim().length > 0 : true) && !sending;

  return (
    <View
      style={{
        borderTopWidth: 3,
        borderTopColor: colors.ink,
        backgroundColor: colors.surface,
        paddingTop: 10,
      }}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ gap: 8, paddingHorizontal: 14, paddingBottom: 10 }}
      >
        {MODE_OPTIONS.map((option) => {
          const active = option.value === mode;
          return (
            <Pressable
              key={option.value}
              onPress={() => onModeChange(option.value)}
              disabled={sending}
              style={({ pressed }) => ({
                minHeight: 40,
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingHorizontal: 12,
                borderRadius: 999,
                borderWidth: 2,
                borderColor: colors.ink,
                backgroundColor: active ? colors.fptBlue : pressed ? "#F0F0F0" : colors.bg,
                opacity: sending ? 0.5 : 1,
              })}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`Chế độ ${option.label}`}
            >
              <Ionicons name={option.icon} size={14} color={active ? colors.onBrand : colors.ink} />
              <Text style={{ fontSize: 12, fontWeight: "700", color: active ? colors.onBrand : colors.ink }}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-end",
          gap: 10,
          paddingHorizontal: 14,
          paddingBottom: 12,
        }}
      >
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder={mode === "chat" ? "Hỏi về tài liệu của bạn..." : "Ghi chú thêm (không bắt buộc)..."}
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
          onSubmitEditing={onSend}
        />
        <Pressable
          onPress={onSend}
          disabled={!canSend}
          style={({ pressed }) => ({
            width: 46,
            height: 46,
            borderRadius: 14,
            borderWidth: 3,
            borderColor: colors.ink,
            backgroundColor: canSend ? colors.fptOrange : "#E5E5E5",
            alignItems: "center",
            justifyContent: "center",
            shadowColor: colors.ink,
            shadowOffset: pressed || !canSend ? { width: 0, height: 0 } : { width: 3, height: 3 },
            shadowOpacity: pressed || !canSend ? 0 : 1,
            shadowRadius: 0,
            elevation: pressed || !canSend ? 0 : 3,
            transform: pressed && canSend ? [{ translateX: 3 }, { translateY: 3 }] : [],
          })}
          accessibilityLabel="Gửi tin nhắn"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-up" size={22} color={canSend ? colors.onBrand : colors.muted} />
        </Pressable>
      </View>
    </View>
  );
}
