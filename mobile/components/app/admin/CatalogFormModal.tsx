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

export type CatalogEntityKind = "curriculum" | "semester" | "subject";

export interface CatalogFormValues {
  code: string;
  name: string;
  description: string;
  sortOrder: string;
}

interface CatalogFormModalProps {
  visible: boolean;
  kind: CatalogEntityKind;
  initial?: Partial<CatalogFormValues>;
  loading?: boolean;
  submitError?: string | null;
  onConfirm: (values: CatalogFormValues) => void;
  onDismiss: () => void;
}

const KIND_LABEL: Record<CatalogEntityKind, string> = {
  curriculum: "chương trình đào tạo",
  semester: "học kỳ",
  subject: "môn học",
};

export function CatalogFormModal({
  visible,
  kind,
  initial,
  loading = false,
  submitError,
  onConfirm,
  onDismiss,
}: CatalogFormModalProps) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(500)).current;
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState("");
  const isEdit = Boolean(initial);

  useEffect(() => {
    if (visible) {
      setCode(initial?.code ?? "");
      setName(initial?.name ?? "");
      setDescription(initial?.description ?? "");
      setSortOrder(initial?.sortOrder ?? "");
      Animated.spring(translateY, { toValue: 0, tension: 70, friction: 12, useNativeDriver: true }).start();
    } else {
      Animated.timing(translateY, { toValue: 500, duration: 200, useNativeDriver: true }).start();
    }
  }, [visible, initial, translateY]);

  const canSubmit = code.trim().length > 0 && name.trim().length > 0;

  function handleConfirm() {
    if (!canSubmit) return;
    onConfirm({ code: code.trim(), name: name.trim(), description: description.trim(), sortOrder: sortOrder.trim() });
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
              maxHeight: "85%",
            }}
          >
            <Pressable>
              <View style={{ alignItems: "center", paddingTop: 12, paddingBottom: 8 }}>
                <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.muted, opacity: 0.4 }} />
              </View>

              <Text style={{ fontSize: 20, fontWeight: "800", color: colors.ink, marginBottom: 20 }}>
                {isEdit ? "Sửa" : "Thêm"} {KIND_LABEL[kind]}
              </Text>

              <Text style={{ fontSize: 13, fontWeight: "700", color: colors.muted, marginBottom: 8 }}>MÃ</Text>
              <TextInput
                value={code}
                onChangeText={setCode}
                placeholder="vd. CS101"
                placeholderTextColor={colors.muted}
                autoCapitalize="characters"
                style={inputStyle}
              />

              <Text style={{ fontSize: 13, fontWeight: "700", color: colors.muted, marginBottom: 8 }}>TÊN</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Tên hiển thị"
                placeholderTextColor={colors.muted}
                style={inputStyle}
              />

              {kind === "semester" ? (
                <>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: colors.muted, marginBottom: 8 }}>
                    THỨ TỰ SẮP XẾP (không bắt buộc)
                  </Text>
                  <TextInput
                    value={sortOrder}
                    onChangeText={setSortOrder}
                    placeholder="vd. 1"
                    placeholderTextColor={colors.muted}
                    keyboardType="number-pad"
                    style={{ ...inputStyle, marginBottom: 20 }}
                  />
                </>
              ) : (
                <>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: colors.muted, marginBottom: 8 }}>
                    MÔ TẢ (không bắt buộc)
                  </Text>
                  <TextInput
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Mô tả ngắn"
                    placeholderTextColor={colors.muted}
                    multiline
                    style={{ ...inputStyle, marginBottom: 20, minHeight: 80, textAlignVertical: "top" }}
                  />
                </>
              )}

              {submitError && (
                <Text style={{ color: colors.error, fontSize: 13, marginBottom: 12 }}>{submitError}</Text>
              )}

              <View style={{ flexDirection: "row", gap: 12 }}>
                <BrutalButton label="Huỷ" onPress={onDismiss} variant="ghost" style={{ flex: 1 }} />
                <BrutalButton
                  label={isEdit ? "Lưu" : "Tạo"}
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

const inputStyle = {
  borderWidth: 3 as const,
  borderColor: colors.ink,
  borderRadius: 12,
  padding: 14,
  fontSize: 16,
  fontWeight: "600" as const,
  color: colors.ink,
  backgroundColor: colors.surface,
  marginBottom: 20,
  minHeight: 50,
};
