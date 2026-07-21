import { useEffect, useRef, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "../../constants/colors";
import { BrutalButton } from "../ui/BrutalButton";

const ACCENT_COLORS = [
  colors.fptBlue,
  colors.fptOrange,
  colors.fptGreen,
  "#8B5CF6",
  "#EC4899",
  "#F59E0B",
];

interface FolderModalProps {
  visible: boolean;
  initialName?: string;
  initialColor?: string | null;
  title?: string;
  onConfirm: (name: string, color: string) => void;
  onDismiss: () => void;
  loading?: boolean;
}

export function FolderModal({
  visible,
  initialName = "",
  initialColor,
  title = "Thư mục mới",
  onConfirm,
  onDismiss,
  loading = false,
}: FolderModalProps) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(initialName);
  const [color, setColor] = useState(initialColor ?? colors.fptBlue);
  const translateY = useRef(new Animated.Value(500)).current;

  useEffect(() => {
    if (visible) {
      setName(initialName);
      setColor(initialColor ?? colors.fptBlue);
      Animated.spring(translateY, { toValue: 0, tension: 70, friction: 12, useNativeDriver: true }).start();
    } else {
      Animated.timing(translateY, { toValue: 500, duration: 200, useNativeDriver: true }).start();
    }
  }, [visible, initialName, initialColor, translateY]);

  function handleConfirm() {
    if (!name.trim()) return;
    onConfirm(name.trim(), color);
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onDismiss}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" }} />
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={onDismiss}
            accessibilityRole="button"
            accessibilityLabel="Đóng tạo thư mục"
          />
          <Animated.View
            style={{
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
              <View style={{ alignItems: "center", paddingTop: 12, paddingBottom: 8 }}>
                <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.muted, opacity: 0.4 }} />
              </View>

              <Text style={{ fontSize: 20, fontWeight: "800", color: colors.ink, marginBottom: 20 }}>
                {title}
              </Text>

              <Text style={{ fontSize: 13, fontWeight: "700", color: colors.muted, marginBottom: 8 }}>
                TÊN THƯ MỤC
              </Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="vd. Ghi chú CS101"
                placeholderTextColor={colors.muted}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleConfirm}
                style={{
                  borderWidth: 3,
                  borderColor: colors.ink,
                  borderRadius: 12,
                  padding: 14,
                  fontSize: 16,
                  fontWeight: "600",
                  color: colors.ink,
                  backgroundColor: colors.surface,
                  marginBottom: 20,
                  minHeight: 50,
                }}
              />

              <Text style={{ fontSize: 13, fontWeight: "700", color: colors.muted, marginBottom: 10 }}>
                MÀU
              </Text>
              <View style={{ flexDirection: "row", gap: 10, marginBottom: 24 }}>
                {ACCENT_COLORS.map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => setColor(c)}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: c,
                      borderWidth: color === c ? 3 : 1.5,
                      borderColor: color === c ? colors.ink : "transparent",
                      shadowColor: color === c ? colors.ink : "transparent",
                      shadowOffset: { width: 2, height: 2 },
                      shadowOpacity: 1,
                      shadowRadius: 0,
                      elevation: color === c ? 3 : 0,
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: color === c }}
                    accessibilityLabel={`Color ${c}`}
                  />
                ))}
              </View>

              <View style={{ flexDirection: "row", gap: 12 }}>
                <BrutalButton
                  label="Huỷ"
                  onPress={onDismiss}
                  variant="ghost"
                  style={{ flex: 1 }}
                />
                <BrutalButton
                  label={title === "Thư mục mới" ? "Tạo" : "Lưu"}
                  onPress={handleConfirm}
                  variant="primary"
                  loading={loading}
                  disabled={!name.trim()}
                  style={{ flex: 1 }}
                />
              </View>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
