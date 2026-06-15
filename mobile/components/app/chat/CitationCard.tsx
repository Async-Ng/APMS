import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { colors } from "../../../constants/colors";

export interface Citation {
  documentId: string;
  documentTitle: string;
  pageNumber: number | null;
  excerpt: string;
}

interface CitationCardProps {
  citation: Citation;
  index: number;
  onPress?: (documentId: string) => void;
}

export function CitationCard({ citation, index, onPress }: CitationCardProps) {
  return (
    <Pressable
      onPress={() => onPress?.(citation.documentId)}
      disabled={!onPress}
      style={({ pressed }) => ({
        backgroundColor: colors.surface,
        borderWidth: 2.5,
        borderColor: colors.ink,
        borderRadius: 12,
        padding: 12,
        gap: 6,
        shadowColor: colors.ink,
        shadowOffset: pressed ? { width: 0, height: 0 } : { width: 3, height: 3 },
        shadowOpacity: pressed ? 0 : 1,
        shadowRadius: 0,
        elevation: pressed ? 0 : 3,
        transform: pressed ? [{ translateX: 3 }, { translateY: 3 }] : [],
        flex: 1,
        minWidth: 160,
      })}
      accessibilityRole="button"
      accessibilityLabel={`Source ${index + 1}: ${citation.documentTitle}`}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <View
          style={{
            width: 20,
            height: 20,
            borderRadius: 4,
            backgroundColor: colors.fptOrange,
            borderWidth: 1.5,
            borderColor: colors.ink,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 9, fontWeight: "800", color: colors.onBrand }}>{index + 1}</Text>
        </View>
        <Text style={{ fontSize: 11, fontWeight: "700", color: colors.muted }}>SOURCE</Text>
      </View>

      <Text style={{ fontSize: 13, fontWeight: "700", color: colors.ink }} numberOfLines={2}>
        {citation.documentTitle}
      </Text>

      {citation.pageNumber !== null && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Ionicons name="bookmark-outline" size={11} color={colors.muted} />
          <Text style={{ fontSize: 11, color: colors.muted }}>Page {citation.pageNumber}</Text>
        </View>
      )}

      <Text style={{ fontSize: 12, color: colors.muted, lineHeight: 17 }} numberOfLines={3}>
        &ldquo;{citation.excerpt}&rdquo;
      </Text>
    </Pressable>
  );
}

export function CitationStrip({ citations, onPress }: { citations: Citation[]; onPress?: (id: string) => void }) {
  if (citations.length === 0) return null;

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Ionicons name="library-outline" size={13} color={colors.muted} />
        <Text style={{ fontSize: 11, fontWeight: "700", color: colors.muted }}>
          {citations.length} SOURCE{citations.length > 1 ? "S" : ""}
        </Text>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {citations.map((c, i) => (
          <CitationCard key={c.documentId + i} citation={c} index={i} onPress={onPress} />
        ))}
      </View>
    </View>
  );
}
