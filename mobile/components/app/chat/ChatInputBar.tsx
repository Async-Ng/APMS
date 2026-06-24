import { Ionicons } from "@expo/vector-icons";
import { useRef } from "react";
import { Pressable, TextInput, View } from "react-native";

import { colors } from "../../../constants/colors";

interface ChatInputBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  sending: boolean;
}

export function ChatInputBar({ value, onChangeText, onSend, sending }: ChatInputBarProps) {
  const inputRef = useRef<TextInput>(null);
  const canSend = value.trim().length > 0 && !sending;

  return (
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
        value={value}
        onChangeText={onChangeText}
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
  );
}
