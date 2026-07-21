import { Ionicons } from "@expo/vector-icons";
import { type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

import { colors } from "../../constants/colors";

interface HeaderBarProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
  below?: ReactNode;
}

export function HeaderBar({ title, subtitle, onBack, right, below }: HeaderBarProps) {
  return (
    <View
      style={{
        borderBottomWidth: 3,
        borderBottomColor: colors.ink,
        backgroundColor: colors.surface,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: below ? 10 : 12,
        }}
      >
        {onBack && <HeaderIconButton icon="arrow-back" onPress={onBack} accessibilityLabel="Quay lại" />}
        <View style={{ flex: 1 }}>
          <Text
            style={{ fontSize: onBack ? 18 : 24, fontWeight: "800", color: colors.ink }}
            numberOfLines={1}
          >
            {title}
          </Text>
          {subtitle && (
            <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
        {right}
      </View>
      {below}
    </View>
  );
}

interface HeaderIconButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  accessibilityLabel: string;
  size?: number;
}

export function HeaderIconButton({ icon, onPress, accessibilityLabel, size = 44 }: HeaderIconButtonProps) {
  const touchSize = Math.max(size, 44);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: touchSize,
        height: touchSize,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: colors.ink,
        backgroundColor: pressed ? "#F0F0F0" : colors.surface,
        alignItems: "center",
        justifyContent: "center",
      })}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Ionicons name={icon} size={20} color={colors.ink} />
    </Pressable>
  );
}

export function HeaderBadge({ label, color = colors.fptOrange }: { label: string; color?: string }) {
  return (
    <View
      style={{
        backgroundColor: color,
        borderWidth: 1.5,
        borderColor: colors.ink,
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 2,
      }}
    >
      <Text style={{ fontSize: 10, fontWeight: "800", color: colors.onBrand }}>{label}</Text>
    </View>
  );
}
