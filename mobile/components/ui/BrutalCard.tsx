import { type ReactNode } from "react";
import { Pressable, View, type ViewStyle } from "react-native";

import { brutalCardStyle, pressedBrutalStyle } from "../../lib/brutal-style";

interface BrutalCardProps {
  children: ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  padding?: number;
  accentColor?: string;
}

export function BrutalCard({ children, onPress, style, padding = 16, accentColor }: BrutalCardProps) {
  const baseStyle: ViewStyle = {
    ...brutalCardStyle,
    padding,
    ...(accentColor ? { backgroundColor: accentColor } : {}),
    ...style,
  };

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({
          ...baseStyle,
          ...pressedBrutalStyle(pressed),
        })}
        accessibilityRole="button"
      >
        {children}
      </Pressable>
    );
  }

  return <View style={baseStyle}>{children}</View>;
}
