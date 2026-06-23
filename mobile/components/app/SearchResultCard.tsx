import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { colors } from "../../constants/colors";
import { type SearchResult } from "../../hooks/useSearch";

interface SearchResultCardProps {
  result: SearchResult;
  index: number;
  onPress: () => void;
}

export function SearchResultCard({ result, index, onPress }: SearchResultCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: colors.surface,
        borderWidth: 3,
        borderColor: colors.ink,
        borderRadius: 16,
        padding: 16,
        gap: 10,
        shadowColor: colors.ink,
        shadowOffset: pressed ? { width: 0, height: 0 } : { width: 4, height: 4 },
        shadowOpacity: pressed ? 0 : 1,
        shadowRadius: 0,
        elevation: pressed ? 0 : 4,
        transform: pressed ? [{ translateX: 4 }, { translateY: 4 }] : [],
      })}
      accessibilityRole="button"
      accessibilityLabel={`Kết quả ${index + 1}: ${result.documentTitle}`}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              backgroundColor: colors.fptOrange,
              borderWidth: 2,
              borderColor: colors.ink,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: "800", color: colors.onBrand }}>{index + 1}</Text>
          </View>
          <Text style={{ fontSize: 11, fontWeight: "700", color: colors.muted }}>
            {(result.score * 100).toFixed(0)}% khớp
          </Text>
        </View>
        {result.pageNumber !== null && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Ionicons name="bookmark-outline" size={12} color={colors.muted} />
            <Text style={{ fontSize: 11, color: colors.muted }}>p.{result.pageNumber}</Text>
          </View>
        )}
      </View>

      <Text style={{ fontSize: 15, fontWeight: "700", color: colors.ink }} numberOfLines={1}>
        {result.documentTitle}
      </Text>

      <Text
        style={{
          fontSize: 13,
          color: colors.muted,
          lineHeight: 19,
          borderLeftWidth: 3,
          borderLeftColor: colors.fptBlue,
          paddingLeft: 10,
        }}
        numberOfLines={4}
      >
        {result.excerpt}
      </Text>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        <Ionicons name="open-outline" size={12} color={colors.fptBlue} />
        <Text style={{ fontSize: 12, color: colors.fptBlue, fontWeight: "700" }}>Xem tài liệu</Text>
      </View>
    </Pressable>
  );
}
