import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { Animated, Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "../../constants/colors";

export interface ActionItem {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

interface ActionSheetProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  actions: ActionItem[];
  onDismiss: () => void;
}

export function ActionSheet({ visible, title, subtitle, actions, onDismiss }: ActionSheetProps) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(400)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
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

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onDismiss}>
      <Pressable style={{ flex: 1 }} onPress={onDismiss}>
        <Animated.View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.45)",
            opacity,
            justifyContent: "flex-end",
          }}
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
                paddingBottom: insets.bottom + 8,
                shadowColor: colors.ink,
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 1,
                shadowRadius: 0,
                elevation: 12,
                transform: [{ translateY }],
              }}
            >
              {/* Handle */}
              <View style={{ alignItems: "center", paddingTop: 12, paddingBottom: 4 }}>
                <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.muted, opacity: 0.4 }} />
              </View>

              {/* Header */}
              <View style={{ paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: "#E5E5E5" }}>
                <Text style={{ fontSize: 16, fontWeight: "800", color: colors.ink }}>{title}</Text>
                {subtitle && <Text style={{ fontSize: 13, color: colors.muted, marginTop: 2 }}>{subtitle}</Text>}
              </View>

              {/* Actions */}
              <View style={{ paddingVertical: 8 }}>
                {actions.map((action, idx) => (
                  <Pressable
                    key={idx}
                    onPress={() => { onDismiss(); action.onPress(); }}
                    disabled={action.disabled}
                    style={({ pressed }) => ({
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 14,
                      paddingHorizontal: 20,
                      paddingVertical: 14,
                      backgroundColor: pressed ? "#F0F0F0" : "transparent",
                      opacity: action.disabled ? 0.4 : 1,
                      minHeight: 52,
                    })}
                    accessibilityRole="button"
                    accessibilityLabel={action.label}
                  >
                    <Ionicons
                      name={action.icon}
                      size={22}
                      color={action.destructive ? colors.error : colors.ink}
                    />
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: "600",
                        color: action.destructive ? colors.error : colors.ink,
                      }}
                    >
                      {action.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Cancel */}
              <View style={{ paddingHorizontal: 16, paddingTop: 4 }}>
                <Pressable
                  onPress={onDismiss}
                  style={({ pressed }) => ({
                    backgroundColor: pressed ? "#E5E5E5" : colors.surface,
                    borderWidth: 2,
                    borderColor: colors.ink,
                    borderRadius: 12,
                    paddingVertical: 14,
                    alignItems: "center",
                    minHeight: 50,
                    justifyContent: "center",
                  })}
                >
                  <Text style={{ fontSize: 15, fontWeight: "700", color: colors.ink }}>Huỷ</Text>
                </Pressable>
              </View>
            </Animated.View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}
