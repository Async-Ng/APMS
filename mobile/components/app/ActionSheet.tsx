import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
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
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Animated.View
          pointerEvents="none"
          style={{
            ...StyleSheet.absoluteFillObject,
            backgroundColor: "rgba(0,0,0,0.45)",
            opacity,
          }}
        />
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel="Đóng bảng thao tác"
        />
        <Animated.View
          style={{
            backgroundColor: colors.bg,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            borderWidth: 3,
            borderBottomWidth: 0,
            borderColor: colors.ink,
            paddingBottom: insets.bottom + 8,
            maxHeight: "85%",
            shadowColor: colors.ink,
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 1,
            shadowRadius: 0,
            elevation: 12,
            transform: [{ translateY }],
          }}
        >
          <View style={{ alignItems: "center", paddingTop: 12, paddingBottom: 4 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.muted, opacity: 0.4 }} />
          </View>

          <View style={{ paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: "#E5E5E5" }}>
            <Text style={{ fontSize: 16, fontWeight: "800", color: colors.ink }} numberOfLines={2}>
              {title}
            </Text>
            {subtitle && <Text style={{ fontSize: 13, color: colors.muted, marginTop: 2 }}>{subtitle}</Text>}
          </View>

          <ScrollView
            style={{ flexShrink: 1 }}
            contentContainerStyle={{ paddingVertical: 8 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator
          >
            {actions.map((action, idx) => (
              <Pressable
                key={`${action.label}-${idx}`}
                onPress={() => {
                  onDismiss();
                  action.onPress();
                }}
                disabled={action.disabled}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 14,
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                  backgroundColor: pressed ? "#F0F0F0" : "transparent",
                  opacity: action.disabled ? 0.4 : 1,
                  minHeight: 52,
                })}
                accessibilityRole="button"
                accessibilityLabel={action.label}
              >
                <Ionicons name={action.icon} size={22} color={action.destructive ? colors.error : colors.ink} />
                <Text
                  style={{
                    flex: 1,
                    fontSize: 15,
                    fontWeight: "600",
                    color: action.destructive ? colors.error : colors.ink,
                  }}
                  numberOfLines={2}
                >
                  {action.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

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
              accessibilityRole="button"
              accessibilityLabel="Huỷ"
            >
              <Text style={{ fontSize: 15, fontWeight: "700", color: colors.ink }}>Huỷ</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
