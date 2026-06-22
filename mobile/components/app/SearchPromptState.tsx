import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { colors } from "../../constants/colors";

const SUGGESTIONS = ["Gradient descent là gì?", "Điểm chính Chương 3", "Giải thích quản lý bộ nhớ"];

export function SearchPromptState({ onPickSuggestion }: { onPickSuggestion: (q: string) => void }) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 40, gap: 20 }}>
      <View
        style={{
          width: 80,
          height: 80,
          borderRadius: 40,
          borderWidth: 3,
          borderColor: colors.ink,
          backgroundColor: colors.fptBlue,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: colors.ink,
          shadowOffset: { width: 4, height: 4 },
          shadowOpacity: 1,
          shadowRadius: 0,
          elevation: 4,
        }}
      >
        <Ionicons name="search" size={36} color={colors.onBrand} />
      </View>
      <Text style={{ fontSize: 20, fontWeight: "800", color: colors.ink, textAlign: "center" }}>Tìm kiếm ngữ nghĩa</Text>
      <Text style={{ fontSize: 14, color: colors.muted, textAlign: "center", lineHeight: 20 }}>
        Đặt câu hỏi bằng ngôn ngữ tự nhiên — APMS tìm các đoạn liên quan nhất trong tài liệu của bạn.
      </Text>
      {SUGGESTIONS.map((q) => (
        <Pressable
          key={q}
          onPress={() => onPickSuggestion(q)}
          style={({ pressed }) => ({
            backgroundColor: pressed ? "#F0F0F0" : colors.surface,
            borderWidth: 2,
            borderColor: colors.ink,
            borderRadius: 10,
            paddingHorizontal: 14,
            paddingVertical: 10,
            width: "100%",
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
          })}
        >
          <Ionicons name="sparkles-outline" size={16} color={colors.fptOrange} />
          <Text style={{ fontSize: 13, color: colors.ink, fontWeight: "600" }}>{q}</Text>
        </Pressable>
      ))}
    </View>
  );
}
