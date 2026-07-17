import { Ionicons } from "@expo/vector-icons";
import { useRef } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { colors } from "../../../constants/colors";
import { CHAT_PRESET_LABELS, type ChatMode } from "../../../hooks/useChat";

type PresetMode = Exclude<ChatMode, "chat">;

interface ChatInputBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onSendPreset?: (mode: PresetMode) => void;
  sending: boolean;
}

const PRESET_MODES: PresetMode[] = ["summary", "faq", "study_guide"];

export function ChatInputBar({ value, onChangeText, onSend, onSendPreset, sending }: ChatInputBarProps) {
  const inputRef = useRef<TextInput>(null);
  const canSend = value.trim().length > 0 && !sending;

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
        {PRESET_MODES.map((mode) => (
          <Pressable
            key={mode}
            onPress={() => onSendPreset?.(mode)}
            disabled={sending || !onSendPreset}
            style={({ pressed }) => ({
              minHeight: 40,
              borderRadius: 999,
              borderWidth: 2,
              borderColor: colors.ink,
              backgroundColor: pressed ? "#F0F0F0" : colors.bg,
              paddingHorizontal: 12,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              opacity: sending || !onSendPreset ? 0.55 : 1,
            })}
            accessibilityRole="button"
            accessibilityLabel={CHAT_PRESET_LABELS[mode]}
          >
            <Ionicons
              name={mode === "summary" ? "reader-outline" : mode === "faq" ? "help-circle-outline" : "school-outline"}
              size={15}
              color={colors.fptBlue}
            />
            <Text style={{ fontSize: 12, fontWeight: "800", color: colors.ink }}>
              {CHAT_PRESET_LABELS[mode]}
            </Text>
          </Pressable>
        ))}
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
    </View>
  );
}
