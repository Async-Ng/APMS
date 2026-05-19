import { fetchAuthSession } from "aws-amplify/auth";
import { Hub } from "aws-amplify/utils";
import { Link, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import "../../lib/amplify";
import { useAuthStore } from "../../stores/auth-store";

export default function AuthCallbackScreen() {
  const router = useRouter();
  const fetchMe = useAuthStore((state) => state.fetchMe);
  const [error, setError] = useState<string | null>(null);
  const finishedRef = useRef(false);

  useEffect(() => {
    async function finishSignIn() {
      if (finishedRef.current) {
        return;
      }

      try {
        const session = await fetchAuthSession({ forceRefresh: true });

        if (!session.tokens?.idToken) {
          setError("Sign-in did not return a valid session.");
          return;
        }

        finishedRef.current = true;
        await fetchMe();
        router.replace("/");
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to complete sign-in.";
        setError(message);
      }
    }

    const unsubscribe = Hub.listen("auth", ({ payload }) => {
      if (payload.event === "signInWithRedirect") {
        void finishSignIn();
        return;
      }

      if (payload.event === "signInWithRedirect_failure") {
        const data = payload.data as { message?: string } | undefined;
        setError(data?.message ?? "Sign-in failed. Please try again.");
      }
    });

    const retryTimer = setTimeout(() => {
      void finishSignIn();
    }, 1500);

    return () => {
      clearTimeout(retryTimer);
      unsubscribe();
    };
  }, [fetchMe, router]);

  if (error) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 24,
          gap: 12,
        }}
      >
        <Text style={{ color: "#dc2626", textAlign: "center" }}>{error}</Text>
        <Link href="/login" style={{ color: "#374151" }}>
          Back to login
        </Link>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" />
      <Text style={{ marginTop: 12, color: "#4b5563" }}>Completing sign-in...</Text>
    </View>
  );
}
