import { getCurrentUser } from "aws-amplify/auth";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { colors } from "../constants/colors";

export default function Index() {
  const [state, setState] = useState<"checking" | "auth" | "guest">("checking");

  useEffect(() => {
    getCurrentUser()
      .then(() => setState("auth"))
      .catch(() => setState("guest"));
  }, []);

  if (state === "checking") {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.fptBlue} />
      </View>
    );
  }

  return <Redirect href={state === "auth" ? "/(tabs)/drive" : "/login"} />;
}
