import { Ionicons } from "@expo/vector-icons";
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

import { colors } from "../../constants/colors";
import { BrutalButton } from "../ui/BrutalButton";

const MAX_TAGS = 20;
const MAX_TAG_LENGTH = 50;

interface TagEditModalProps {
  visible: boolean;
  title: string;
  initialTags: string[];
  onConfirm: (tags: string[]) => void;
  onDismiss: () => void;
  loading?: boolean;
}

export function TagEditModal({
  visible,
  title,
  initialTags,
  onConfirm,
  onDismiss,
  loading = false,
}: TagEditModalProps) {
  const insets = useSafeAreaInsets();
  const [tags, setTags] = useState<string[]>(initialTags);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const translateY = useRef(new Animated.Value(500)).current;

  useEffect(() => {
    if (visible) {
      setTags(initialTags);
      setInput("");
      setError(null);
      Animated.spring(translateY, { toValue: 0, tension: 70, friction: 12, useNativeDriver: true }).start();
    } else {
      Animated.timing(translateY, { toValue: 500, duration: 200, useNativeDriver: true }).start();
    }
  }, [visible, initialTags, translateY]);

  function addTag(raw: string) {
    const value = raw.trim();
    if (!value) return;
    if (value.length > MAX_TAG_LENGTH) {
      setError(`Thẻ không được dài quá ${MAX_TAG_LENGTH} ký tự.`);
      return;
    }
    if (tags.some((t) => t.toLowerCase() === value.toLowerCase())) {
      setInput("");
      return;
    }
    if (tags.length >= MAX_TAGS) {
      setError(`Tối đa ${MAX_TAGS} thẻ.`);
      return;
    }
    setTags((prev) => [...prev, value]);
    setInput("");
    setError(null);
  }

  function removeTag(value: string) {
    setTags((prev) => prev.filter((t) => t !== value));
  }

  function handleConfirm() {
    addTag(input);
    onConfirm(tags);
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onDismiss}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
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
              transform: [{ translateY }],
            }}
          >
            <Pressable>
              <View style={{ alignItems: "center", paddingTop: 12, paddingBottom: 8 }}>
                <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.muted, opacity: 0.4 }} />
              </View>

              <Text style={{ fontSize: 20, fontWeight: "800", color: colors.ink, marginBottom: 20 }}>
                {title}
              </Text>

              <Text style={{ fontSize: 13, fontWeight: "700", color: colors.muted, marginBottom: 8 }}>
                THẺ
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 6,
                  borderWidth: 3,
                  borderColor: colors.ink,
                  borderRadius: 12,
                  padding: 10,
                  backgroundColor: colors.surface,
                  marginBottom: 8,
                }}
              >
                {tags.map((tag) => (
                  <View
                    key={tag}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                      borderWidth: 2,
                      borderColor: colors.ink,
                      borderRadius: 999,
                      backgroundColor: colors.bg,
                      paddingLeft: 10,
                      paddingRight: 6,
                      paddingVertical: 4,
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: "600", color: colors.ink }}>{tag}</Text>
                    <Pressable
                      onPress={() => removeTag(tag)}
                      accessibilityRole="button"
                      accessibilityLabel={`Xoá thẻ ${tag}`}
                      hitSlop={6}
                    >
                      <Ionicons name="close" size={14} color={colors.ink} />
                    </Pressable>
                  </View>
                ))}
                <TextInput
                  value={input}
                  onChangeText={(v) => {
                    setInput(v);
                    setError(null);
                  }}
                  onSubmitEditing={() => addTag(input)}
                  onBlur={() => addTag(input)}
                  placeholder={tags.length === 0 ? "Nhập thẻ rồi nhấn Enter…" : ""}
                  placeholderTextColor={colors.muted}
                  returnKeyType="done"
                  maxLength={MAX_TAG_LENGTH}
                  style={{
                    minWidth: 100,
                    flex: 1,
                    fontSize: 14,
                    fontWeight: "600",
                    color: colors.ink,
                    paddingVertical: 4,
                  }}
                />
              </View>
              <Text style={{ fontSize: 12, color: colors.muted, marginBottom: 8 }}>
                Tối đa {MAX_TAGS} thẻ, mỗi thẻ tối đa {MAX_TAG_LENGTH} ký tự.
              </Text>
              {error && (
                <Text style={{ fontSize: 13, fontWeight: "600", color: colors.error, marginBottom: 8 }}>
                  {error}
                </Text>
              )}

              <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
                <BrutalButton
                  label="Huỷ"
                  onPress={onDismiss}
                  variant="ghost"
                  style={{ flex: 1 }}
                />
                <BrutalButton
                  label="Lưu"
                  onPress={handleConfirm}
                  variant="primary"
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
