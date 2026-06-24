import { useEffect, useRef } from "react";
import { Animated, View, type ViewStyle } from "react-native";

import { colors } from "../../constants/colors";

interface SkeletonCardProps {
  height?: number;
  style?: ViewStyle;
}

function SkeletonLine({ width, height = 12 }: { width: `${number}%` | number; height?: number }) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 600, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={{
        width,
        height,
        borderRadius: 6,
        backgroundColor: "#E2E8F0",
        opacity,
      }}
    />
  );
}

export function SkeletonCard({ height = 80, style }: SkeletonCardProps) {
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderWidth: 3,
        borderColor: "#E2E8F0",
        borderRadius: 16,
        padding: 16,
        gap: 10,
        height,
        justifyContent: "center",
        ...style,
      }}
    >
      <SkeletonLine width="60%" height={14} />
      <SkeletonLine width="40%" height={10} />
    </View>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <View style={{ gap: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}
