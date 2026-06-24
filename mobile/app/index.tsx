import { getCurrentUser, signOut } from "aws-amplify/auth";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { colors } from "../constants/colors";
import { useAuthStore } from "../stores/auth-store";

export default function Index() {
  const [state, setState] = useState<"checking" | "auth" | "guest">("checking");

  useEffect(() => {
    async function checkSession() {
      try {
        await getCurrentUser();
        await useAuthStore.getState().fetchMe();
        setState("auth");
      } catch {
        await signOut();
        setState("guest");
      }
    }

    void checkSession();
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
