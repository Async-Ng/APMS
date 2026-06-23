import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { colors } from "../../constants/colors";

interface ProfileMenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle?: string;
  onPress: () => void;
  destructive?: boolean;
  badge?: string;
}

export function ProfileMenuItem({ icon, label, subtitle, onPress, destructive = false, badge }: ProfileMenuItemProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        paddingVertical: 14,
        paddingHorizontal: 16,
        backgroundColor: pressed ? "#F0F0F0" : "transparent",
        borderRadius: 10,
        minHeight: 52,
      })}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          borderWidth: 2,
          borderColor: colors.ink,
          backgroundColor: destructive ? "#FEE2E2" : colors.surface,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: colors.ink,
          shadowOffset: { width: 2, height: 2 },
          shadowOpacity: 1,
          shadowRadius: 0,
          elevation: 2,
        }}
      >
        <Ionicons name={icon} size={18} color={destructive ? colors.error : colors.ink} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: "600", color: destructive ? colors.error : colors.ink }}>
          {label}
        </Text>
        {subtitle && <Text style={{ fontSize: 12, color: colors.muted }}>{subtitle}</Text>}
      </View>
      {badge && (
        <View
          style={{
            backgroundColor: colors.fptOrange,
            borderWidth: 1.5,
            borderColor: colors.ink,
            borderRadius: 999,
            paddingHorizontal: 7,
            paddingVertical: 1,
          }}
        >
          <Text style={{ fontSize: 10, fontWeight: "800", color: colors.onBrand }}>{badge}</Text>
        </View>
      )}
      {!badge && !destructive && <Ionicons name="chevron-forward" size={18} color={colors.muted} />}
    </Pressable>
  );
}
