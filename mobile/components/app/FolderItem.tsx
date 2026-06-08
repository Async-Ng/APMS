import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { colors } from "../../constants/colors";
import { pressedBrutalStyle } from "../../lib/brutal-style";

interface FolderItemProps {
  name: string;
  isStarred?: boolean;
  accentColor?: string | null;
  onPress: () => void;
  onLongPress: () => void;
}

export function FolderItem({ name, isStarred, accentColor, onPress, onLongPress }: FolderItemProps) {
  const folderColor = accentColor ?? colors.fptBlue;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        backgroundColor: colors.surface,
        borderWidth: 3,
        borderColor: colors.ink,
        borderRadius: 14,
        padding: 14,
        shadowColor: colors.ink,
        shadowOffset: pressed ? { width: 0, height: 0 } : { width: 4, height: 4 },
        shadowOpacity: pressed ? 0 : 1,
        shadowRadius: 0,
        elevation: pressed ? 0 : 4,
        transform: pressed ? [{ translateX: 4 }, { translateY: 4 }] : [],
      })}
      accessibilityRole="button"
      accessibilityLabel={`Folder: ${name}`}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 10,
          borderWidth: 2,
          borderColor: colors.ink,
          backgroundColor: folderColor,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="folder" size={22} color={colors.onBrand} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: "700", color: colors.ink }} numberOfLines={1}>
          {name}
        </Text>
        <Text style={{ fontSize: 12, color: colors.muted }}>Folder</Text>
      </View>
      {isStarred && <Ionicons name="star" size={16} color={colors.fptOrange} />}
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
  );
}
