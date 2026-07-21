import { Pressable, ScrollView, Text, View } from "react-native";

import { colors } from "../../../constants/colors";

interface SuggestedQuestionsProps {
  questions: string[];
  onSelect: (question: string) => void;
  disabled?: boolean;
}

export function SuggestedQuestions({ questions, onSelect, disabled }: SuggestedQuestionsProps) {
  if (questions.length === 0) return null;

  return (
    <View style={{ marginTop: 4 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {questions.map((question) => (
          <Pressable
            key={question}
            onPress={() => onSelect(question)}
            disabled={disabled}
            style={({ pressed }) => ({
              maxWidth: 260,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 14,
              borderWidth: 2,
              borderColor: colors.ink,
              backgroundColor: pressed ? colors.bg : colors.surface,
              opacity: disabled ? 0.5 : 1,
            })}
            accessibilityRole="button"
          >
            <Text style={{ fontSize: 12, fontWeight: "600", color: colors.ink }} numberOfLines={2}>
              {question}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
