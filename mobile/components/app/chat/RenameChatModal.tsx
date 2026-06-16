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

interface RenameChatModalProps {
  visible: boolean;
  initialTitle: string;
  onConfirm: (title: string) => void;
  onDismiss: () => void;
  loading?: boolean;
}

export function RenameChatModal({
  visible,
  initialTitle,
  onConfirm,
  onDismiss,
  loading = false,
}: RenameChatModalProps) {
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState(initialTitle);
  const translateY = useRef(new Animated.Value(500)).current;

  useEffect(() => {
    if (visible) {
      setTitle(initialTitle);
      Animated.spring(translateY, {
        toValue: 0,
        tension: 70,
        friction: 12,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(translateY, { toValue: 500, duration: 200, useNativeDriver: true }).start();
    }
  }, [visible, initialTitle, translateY]);

  function handleConfirm() {
    const trimmed = title.trim();
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

              <Text style={{ fontSize: 20, fontWeight: "800", color: colors.ink, marginBottom: 20 }}>
                Đổi tên cuộc trò chuyện
              </Text>

              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Tên cuộc trò chuyện"
                placeholderTextColor={colors.muted}
                maxLength={255}
                autoFocus
                style={{
                  borderWidth: 3,
                  borderColor: colors.ink,
                  borderRadius: 14,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontSize: 16,
                  fontWeight: "600",
                  color: colors.ink,
                  backgroundColor: colors.surface,
                  marginBottom: 20,
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
                  label={loading ? "Đang lưu…" : "Lưu"}
                  onPress={handleConfirm}
                  disabled={!title.trim() || loading}
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
