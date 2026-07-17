import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { colors } from "../../../constants/colors";
import { type Citation } from "../../../hooks/useChat";

interface CitationCardProps {
  citation: Citation;
  index: number;
  onPress?: (citation: Citation) => void;
}

function formatSection(citation: Citation): string | null {
  if (citation.heading) return citation.heading;
  if (citation.sectionPath?.length) return citation.sectionPath.join(" / ");
  return null;
}

export function CitationCard({ citation, index, onPress }: CitationCardProps) {
  const section = formatSection(citation);

  return (
    <Pressable
      onPress={() => onPress?.(citation)}
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
        minWidth: 170,
      })}
      accessibilityRole="button"
      accessibilityLabel={`Nguồn ${index + 1}: ${citation.documentTitle}`}
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
        <Text style={{ fontSize: 11, fontWeight: "700", color: colors.muted }}>Nguồn</Text>
      </View>

      <Text style={{ fontSize: 13, fontWeight: "700", color: colors.ink }} numberOfLines={2}>
        {citation.documentTitle}
      </Text>

      {section && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Ionicons name="list-outline" size={11} color={colors.muted} />
          <Text style={{ flex: 1, fontSize: 11, color: colors.muted }} numberOfLines={1}>
            Phần {section}
          </Text>
        </View>
      )}

      {citation.pageNumber !== null && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Ionicons name="bookmark-outline" size={11} color={colors.muted} />
          <Text style={{ fontSize: 11, color: colors.muted }}>Trang {citation.pageNumber}</Text>
        </View>
      )}

      <Text style={{ fontSize: 12, color: colors.muted, lineHeight: 17 }} numberOfLines={3}>
        &ldquo;{citation.excerpt}&rdquo;
      </Text>
    </Pressable>
  );
}

export function CitationStrip({ citations, onPress }: { citations: Citation[]; onPress?: (citation: Citation) => void }) {
  if (citations.length === 0) return null;

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Ionicons name="library-outline" size={13} color={colors.muted} />
        <Text style={{ fontSize: 11, fontWeight: "700", color: colors.muted }}>
          {citations.length} nguồn
        </Text>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {citations.map((c, i) => (
          <CitationCard key={`${c.documentId}-${c.chunkIndex ?? i}`} citation={c} index={i} onPress={onPress} />
        ))}
      </View>
    </View>
  );
}
