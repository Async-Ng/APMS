import { useEffect, useRef, useState } from "react";
import { Animated, KeyboardAvoidingView, Modal, Platform, Pressable, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "../../../constants/colors";
import { BrutalButton } from "../../ui/BrutalButton";

interface AddAccessEmailModalProps {
  visible: boolean;
  loading?: boolean;
  onConfirm: (entries: { email: string; note?: string }[]) => void;
  onDismiss: () => void;
}

export function AddAccessEmailModal({ visible, loading = false, onConfirm, onDismiss }: AddAccessEmailModalProps) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(500)).current;
  const [emailsText, setEmailsText] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (visible) {
      setEmailsText("");
      setNote("");
      Animated.spring(translateY, { toValue: 0, tension: 70, friction: 12, useNativeDriver: true }).start();
    } else {
      Animated.timing(translateY, { toValue: 500, duration: 200, useNativeDriver: true }).start();
    }
  }, [visible, translateY]);

  const emails = emailsText
    .split(/[\n,]/)
    .map((e) => e.trim())
    .filter(Boolean);
  const canSubmit = emails.length > 0;

  function handleConfirm() {
    if (!canSubmit) return;
    onConfirm(emails.map((email) => ({ email, note: note.trim() || undefined })));
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onDismiss}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }} onPress={onDismiss}>
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
            }}
          >
            <Pressable>
              <View style={{ alignItems: "center", paddingTop: 12, paddingBottom: 8 }}>
                <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.muted, opacity: 0.4 }} />
              </View>

              <Text style={{ fontSize: 20, fontWeight: "800", color: colors.ink, marginBottom: 4 }}>
                Thêm email ngoại lệ
              </Text>
              <Text style={{ fontSize: 12, color: colors.muted, marginBottom: 16 }}>
                Mỗi dòng (hoặc dấu phẩy) một email — tối đa 500.
              </Text>

              <TextInput
                value={emailsText}
                onChangeText={setEmailsText}
                placeholder={"vd. student@gmail.com\nother@outlook.com"}
                placeholderTextColor={colors.muted}
                multiline
                autoCapitalize="none"
                keyboardType="email-address"
                style={{
                  borderWidth: 3,
                  borderColor: colors.ink,
                  borderRadius: 12,
                  padding: 14,
                  fontSize: 15,
                  color: colors.ink,
                  backgroundColor: colors.surface,
                  marginBottom: 16,
                  minHeight: 100,
                  textAlignVertical: "top",
                }}
              />

              <Text style={{ fontSize: 13, fontWeight: "700", color: colors.muted, marginBottom: 8 }}>
                GHI CHÚ CHUNG (không bắt buộc)
              </Text>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="vd. Sinh viên trao đổi kỳ Fall 2026"
                placeholderTextColor={colors.muted}
                style={{
                  borderWidth: 3,
                  borderColor: colors.ink,
                  borderRadius: 12,
                  padding: 14,
                  fontSize: 15,
                  color: colors.ink,
                  backgroundColor: colors.surface,
                  marginBottom: 20,
                  minHeight: 50,
                }}
              />

              <View style={{ flexDirection: "row", gap: 12 }}>
                <BrutalButton label="Huỷ" onPress={onDismiss} variant="ghost" style={{ flex: 1 }} />
                <BrutalButton
                  label={`Thêm (${emails.length})`}
                  onPress={handleConfirm}
                  variant="primary"
                  loading={loading}
                  disabled={!canSubmit}
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
