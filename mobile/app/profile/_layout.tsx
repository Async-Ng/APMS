import { Stack } from "expo-router";

import { RequireAuth } from "../../components/app/RequireAuth";

export default function ProfileLayout() {
  return (
    <RequireAuth>
      <Stack screenOptions={{ headerShown: false }} />
    </RequireAuth>
  );
}
