import { ActivityIndicator, Pressable, Text, type ViewStyle } from "react-native";

import { colors } from "../../constants/colors";
import { brutalCtaStyle, pressedBrutalStyle } from "../../lib/brutal-style";

type Variant = "primary" | "secondary" | "accent" | "ghost" | "danger";

interface BrutalButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  size?: "sm" | "md" | "lg";
  style?: ViewStyle;
}

const variantBg: Record<Variant, string> = {
  primary: colors.fptOrange,
  secondary: colors.fptBlue,
  accent: colors.fptGreen,
  ghost: colors.surface,
  danger: colors.error,
};

const variantText: Record<Variant, string> = {
  primary: colors.onBrand,
  secondary: colors.onBrand,
  accent: colors.onBrand,
  ghost: colors.ink,
  danger: colors.onBrand,
};

const sizeStyle = {
  sm: { minHeight: 44, paddingHorizontal: 14, fontSize: 13 },
  md: { minHeight: 44, paddingHorizontal: 20, fontSize: 15 },
  lg: { minHeight: 52, paddingHorizontal: 24, fontSize: 16 },
};

export function BrutalButton({
  label,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  fullWidth = false,
  size = "md",
  style,
}: BrutalButtonProps) {
  const sz = sizeStyle[size];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => ({
        ...brutalCtaStyle,
        backgroundColor: variantBg[variant],
        minHeight: sz.minHeight,
        paddingHorizontal: sz.paddingHorizontal,
        width: fullWidth ? "100%" : undefined,
        opacity: disabled ? 0.45 : 1,
        ...pressedBrutalStyle(pressed && !disabled),
        ...style,
      })}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variantText[variant]} />
      ) : (
        <Text style={{ color: variantText[variant], fontWeight: "700", fontSize: sz.fontSize }}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}
