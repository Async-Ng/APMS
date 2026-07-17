import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { colors } from "../../constants/colors";
import { StatusBadge } from "../ui/StatusBadge";

type DocStatus = "pending" | "processing" | "ready" | "failed";

interface FileItemProps {
  title: string;
  mimeType: string;
  fileSizeBytes: number;
  status: DocStatus;
  createdAt?: string;
  isStarred?: boolean;
  courseLabel?: string | null;
  onPress: () => void;
  onLongPress: () => void;
}

function getFileIcon(mimeType: string): { name: keyof typeof Ionicons.glyphMap; color: string } {
  if (mimeType.includes("pdf")) return { name: "document-text", color: "#E53E3E" };
  if (mimeType.includes("word") || mimeType.includes("document")) return { name: "document", color: colors.fptBlue };
  if (mimeType.includes("presentation")) return { name: "easel", color: colors.fptOrange };
  return { name: "document-outline", color: colors.muted };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileItem({
  title,
  mimeType,
  fileSizeBytes,
  status,
  createdAt,
  isStarred,
  courseLabel,
  onPress,
  onLongPress,
}: FileItemProps) {
  const icon = getFileIcon(mimeType);

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
      accessibilityLabel={`Document: ${title}`}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 10,
          borderWidth: 2,
          borderColor: colors.ink,
          backgroundColor: "#F8F8F8",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={icon.name} size={22} color={icon.color} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ fontSize: 15, fontWeight: "700", color: colors.ink }} numberOfLines={1}>
          {title}
        </Text>
        {courseLabel && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <Ionicons name="school-outline" size={13} color={colors.fptBlue} />
            <Text style={{ fontSize: 12, fontWeight: "700", color: colors.fptBlue }} numberOfLines={1}>
              {courseLabel}
            </Text>
          </View>
        )}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <StatusBadge status={status} createdAt={createdAt} />
          <Text style={{ fontSize: 11, color: colors.muted }}>{formatBytes(fileSizeBytes)}</Text>
        </View>
      </View>
      {isStarred && <Ionicons name="star" size={16} color={colors.fptOrange} />}
    </Pressable>
  );
}
