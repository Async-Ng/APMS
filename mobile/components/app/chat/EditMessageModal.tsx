import { useEffect, useRef, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "../../../constants/colors";
import { BrutalButton } from "../../ui/BrutalButton";

interface EditMessageModalProps {
  visible: boolean;
  initialContent: string;
  onConfirm: (content: string) => void;
  onDismiss: () => void;
  loading?: boolean;
}

export function EditMessageModal({
  visible,
  initialContent,
  onConfirm,
  onDismiss,
  loading = false,
}: EditMessageModalProps) {
  const insets = useSafeAreaInsets();
  const [content, setContent] = useState(initialContent);
  const translateY = useRef(new Animated.Value(500)).current;

  useEffect(() => {
    if (visible) {
      setContent(initialContent);
      Animated.spring(translateY, {
        toValue: 0,
        tension: 70,
        friction: 12,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(translateY, { toValue: 500, duration: 200, useNativeDriver: true }).start();
    }
  }, [visible, initialContent, translateY]);

  function handleConfirm() {
    const trimmed = content.trim();
    if (!trimmed) return;
    onConfirm(trimmed);
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onDismiss}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }}
          onPress={onDismiss}
        >
          <Animated.View
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: colors.bg,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              borderWidth: 3,
              borderBottomWidth: 0,
              borderColor: colors.ink,
              paddingHorizontal: 20,
              paddingBottom: insets.bottom + 16,
              transform: [{ translateY }],
            }}
          >
            <Pressable>
              <View style={{ alignItems: "center", paddingTop: 12, paddingBottom: 8 }}>
                <View
                  style={{
                    width: 40,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: colors.muted,
                    opacity: 0.4,
                  }}
                />
              </View>

              <Text style={{ fontSize: 20, fontWeight: "800", color: colors.ink, marginBottom: 6 }}>
                Sửa câu hỏi
              </Text>
              <Text style={{ fontSize: 12, color: colors.muted, marginBottom: 14, lineHeight: 17 }}>
                Các tin nhắn sau câu hỏi này sẽ được thay bằng câu trả lời mới (tính 1 lượt trong ngày).
              </Text>

              <TextInput
                value={content}
                onChangeText={setContent}
                placeholder="Nội dung câu hỏi"
                placeholderTextColor={colors.muted}
                maxLength={2000}
                autoFocus
                multiline
                style={{
                  borderWidth: 3,
                  borderColor: colors.ink,
                  borderRadius: 14,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontSize: 15,
                  fontWeight: "600",
                  color: colors.ink,
                  backgroundColor: colors.surface,
                  marginBottom: 20,
                  minHeight: 80,
                  maxHeight: 160,
                  textAlignVertical: "top",
                }}
              />

              <View style={{ flexDirection: "row", gap: 12 }}>
                <BrutalButton
                  label="Huỷ"
                  variant="secondary"
                  onPress={onDismiss}
                  disabled={loading}
                  style={{ flex: 1 }}
                />
                <BrutalButton
                  label={loading ? "Đang gửi…" : "Gửi lại"}
                  onPress={handleConfirm}
                  disabled={!content.trim() || loading}
                  loading={loading}
                  style={{ flex: 1 }}
                />
              </View>
            </Pressable>
          </Animated.View>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
