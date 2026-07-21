import "../lib/polyfills";
import "@aws-amplify/react-native";
import "react-native-get-random-values";

import * as SplashScreen from "expo-splash-screen";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { Toast } from "../components/ui/Toast";
import { colors } from "../constants/colors";
import { QueryProvider } from "../lib/query-client";
import "../lib/amplify";

export default function RootLayout() {
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <QueryProvider>
          <Stack screenOptions={{ headerShown: false }} />
          <Toast />
        </QueryProvider>
      </SafeAreaProvider>
    </View>
  );
}
