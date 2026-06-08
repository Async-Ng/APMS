import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { Animated, Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "../../constants/colors";
import { BrutalButton } from "../ui/BrutalButton";

interface UploadSheetProps {
  visible: boolean;
  folderId?: string | null;
  onDismiss: () => void;
  onUploadStart?: () => void;
}

const FILE_TYPES = [
  { label: "PDF Document", ext: ".pdf", mime: "application/pdf", icon: "document-text" as const, color: "#E53E3E" },
  { label: "Word Document", ext: ".docx", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", icon: "document" as const, color: colors.fptBlue },
  { label: "PowerPoint", ext: ".pptx", mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation", icon: "easel" as const, color: colors.fptOrange },
];

export function UploadSheet({ visible, onDismiss, onUploadStart }: UploadSheetProps) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(400)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setSelected(null);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 400, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, opacity, translateY]);

  function handlePickFile(mime: string) {
    setSelected(mime);
    onDismiss();
    onUploadStart?.();
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onDismiss}>
      <Pressable style={{ flex: 1 }} onPress={onDismiss}>
        <Animated.View
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", opacity, justifyContent: "flex-end" }}
        >
          <Pressable>
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
              <View style={{ alignItems: "center", paddingTop: 12, paddingBottom: 4 }}>
                <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.muted, opacity: 0.4 }} />
              </View>

              <Text style={{ fontSize: 20, fontWeight: "800", color: colors.ink, marginTop: 8, marginBottom: 4 }}>
                Upload Document
              </Text>
              <Text style={{ fontSize: 13, color: colors.muted, marginBottom: 20 }}>
                Supported: PDF, DOCX, PPTX · Max 50 MB
              </Text>

              <View style={{ gap: 12, marginBottom: 20 }}>
                {FILE_TYPES.map((type) => (
                  <Pressable
                    key={type.mime}
                    onPress={() => handlePickFile(type.mime)}
                    style={({ pressed }) => ({
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 14,
                      backgroundColor: colors.surface,
                      borderWidth: 3,
                      borderColor: colors.ink,
                      borderRadius: 14,
                      padding: 16,
                      shadowColor: colors.ink,
                      shadowOffset: pressed ? { width: 0, height: 0 } : { width: 4, height: 4 },
                      shadowOpacity: pressed ? 0 : 1,
                      shadowRadius: 0,
                      elevation: pressed ? 0 : 4,
                      transform: pressed ? [{ translateX: 4 }, { translateY: 4 }] : [],
                    })}
                    accessibilityRole="button"
                    accessibilityLabel={`Upload ${type.label}`}
                  >
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 10,
                        borderWidth: 2,
                        borderColor: colors.ink,
                        backgroundColor: type.color,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Ionicons name={type.icon} size={22} color={colors.onBrand} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: "700", color: colors.ink }}>{type.label}</Text>
                      <Text style={{ fontSize: 12, color: colors.muted }}>{type.ext}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                  </Pressable>
                ))}
              </View>

              <BrutalButton label="Cancel" onPress={onDismiss} variant="ghost" fullWidth />
            </Animated.View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}
