import { signOut } from "aws-amplify/auth";
import { Link } from "expo-router";
import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";

import { useAuthStore } from "../stores/auth-store";

export default function Index() {
  const { user, isLoading, fetchMe, clearUser } = useAuthStore();

  useEffect(() => {
    void fetchMe();
  }, [fetchMe]);

  async function handleSignOut() {
    await signOut();
    clearUser();
  }

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
        backgroundColor: "#f9fafb",
      }}
    >
      <Text style={{ fontSize: 32, fontWeight: "700", marginBottom: 8 }}>APMS</Text>
      <Text style={{ fontSize: 16, color: "#4b5563", marginBottom: 24, textAlign: "center" }}>
        Academic Personal Management System
      </Text>

      {isLoading && <Text style={{ color: "#6b7280" }}>Loading...</Text>}

      {!isLoading && user && (
        <View style={{ alignItems: "center", gap: 12 }}>
          <Text style={{ color: "#374151" }}>Signed in as {user.displayName}</Text>
          <Pressable
            onPress={() => void handleSignOut()}
            style={{
              borderWidth: 1,
              borderColor: "#d1d5db",
              borderRadius: 8,
              paddingHorizontal: 16,
              paddingVertical: 8,
            }}
          >
            <Text>Sign out</Text>
          </Pressable>
        </View>
      )}

      {!isLoading && !user && (
        <Link
          href="/login"
          style={{
            backgroundColor: "#111827",
            color: "#fff",
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          Sign in with Google
        </Link>
      )}
    </View>
  );
}
