import { Stack } from "expo-router";

import { RequireAuth } from "../../components/app/RequireAuth";

export default function DocumentsLayout() {
  return (
    <RequireAuth>
      <Stack screenOptions={{ headerShown: false }} />
    </RequireAuth>
  );
}
