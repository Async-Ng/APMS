import { ActivityIndicator, Text, View } from "react-native";

import { colors } from "../../constants/colors";

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = "Đang xác thực..." }: LoadingScreenProps) {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: colors.bg,
        gap: 12,
      }}
    >
      <ActivityIndicator size="large" color={colors.fptBlue} />
      <Text style={{ fontSize: 14, fontWeight: "600", color: colors.muted }}>{message}</Text>
    </View>
  );
}
