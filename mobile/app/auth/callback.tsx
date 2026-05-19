import { fetchAuthSession } from "aws-amplify/auth";
import { Hub } from "aws-amplify/utils";
import { Link, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { colors } from "../../constants/colors";
import { brutalCardStyle } from "../../lib/brutal-style";
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
        router.replace("/login");
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
          backgroundColor: colors.bg,
        }}
      >
        <View style={{ ...brutalCardStyle, padding: 20, maxWidth: 400 }}>
          <Text style={{ color: colors.error, textAlign: "center", marginBottom: 12 }}>
            {error}
          </Text>
          <Link href="/login" style={{ color: colors.fptBlue, textAlign: "center", fontWeight: "700" }}>
            Back to login
          </Link>
        </View>
      </View>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: colors.bg,
        padding: 24,
      }}
    >
      <View style={{ ...brutalCardStyle, padding: 24, alignItems: "center", gap: 12 }}>
        <ActivityIndicator size="large" color={colors.fptBlue} />
        <Text style={{ fontWeight: "800", fontSize: 18, color: colors.ink }}>
          Completing sign-in...
        </Text>
        <Text style={{ color: colors.muted }}>Please wait a moment.</Text>
      </View>
    </View>
  );
}
