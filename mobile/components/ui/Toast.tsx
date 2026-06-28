import { useEffect, useRef } from "react";
import { Animated, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "../../constants/colors";
import { useToastStore } from "../../stores/toast-store";

const AUTO_DISMISS_MS = 3000;

export function Toast() {
  const insets = useSafeAreaInsets();
  const { message, variant, hide } = useToastStore();
  const translateY = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (!message) return;

    Animated.spring(translateY, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }).start();

    const timer = setTimeout(() => {
      Animated.timing(translateY, { toValue: -100, duration: 200, useNativeDriver: true }).start(() => hide());
    }, AUTO_DISMISS_MS);

    return () => clearTimeout(timer);
  }, [message, translateY, hide]);

  if (!message) return null;

  return (
    <Animated.View
      style={{
        position: "absolute",
        top: insets.top + 8,
        left: 16,
        right: 16,
        zIndex: 999,
        transform: [{ translateY }],
        backgroundColor: colors.surface,
        borderWidth: 2.5,
        borderColor: colors.ink,
        borderRadius: 12,
        borderLeftWidth: 6,
        borderLeftColor: variant === "error" ? colors.error : colors.fptGreen,
        padding: 14,
        shadowColor: colors.ink,
        shadowOffset: { width: 3, height: 3 },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 4,
      }}
    >
      <Text style={{ color: colors.ink, fontSize: 14, fontWeight: "600" }}>{message}</Text>
    </Animated.View>
  );
}
