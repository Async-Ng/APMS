import "react-native-get-random-values";

import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { Toast } from "../components/ui/Toast";
import { QueryProvider } from "../lib/query-client";
import "../lib/amplify";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryProvider>
        <Stack screenOptions={{ headerShown: false }} />
        <Toast />
      </QueryProvider>
    </SafeAreaProvider>
  );
}
