import { Text, View } from "react-native";

import { colors } from "../../constants/colors";

export function SectionHeaderRow({ label, count }: { label: string; count: number }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 }}>
      <Text style={{ fontSize: 13, fontWeight: "800", color: colors.muted, letterSpacing: 0.5 }}>
        {label.toUpperCase()}
      </Text>
      <Text style={{ fontSize: 12, color: colors.muted }}>{count}</Text>
    </View>
  );
}
