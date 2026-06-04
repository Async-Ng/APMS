import { Text, View, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors } from "../../constants/colors";
import { BrutalButton } from "./BrutalButton";

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  action?: { label: string; onPress: () => void };
  style?: ViewStyle;
}

export function EmptyState({ icon = "folder-open-outline", title, description, action, style }: EmptyStateProps) {
  return (
    <View style={{ alignItems: "center", padding: 40, gap: 16, ...style }}>
      <View
        style={{
          width: 80,
          height: 80,
          borderRadius: 40,
          borderWidth: 3,
          borderColor: colors.ink,
          backgroundColor: colors.surface,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: colors.ink,
          shadowOffset: { width: 3, height: 3 },
          shadowOpacity: 1,
          shadowRadius: 0,
          elevation: 3,
        }}
      >
        <Ionicons name={icon} size={36} color={colors.muted} />
      </View>
      <Text style={{ fontSize: 18, fontWeight: "800", color: colors.ink, textAlign: "center" }}>{title}</Text>
      {description && (
        <Text style={{ fontSize: 14, color: colors.muted, textAlign: "center", lineHeight: 20 }}>{description}</Text>
      )}
      {action && (
        <BrutalButton label={action.label} onPress={action.onPress} size="sm" />
      )}
    </View>
  );
}
