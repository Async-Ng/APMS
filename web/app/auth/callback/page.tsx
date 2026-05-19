"use client";

import { fetchAuthSession } from "aws-amplify/auth";
import { Hub } from "aws-amplify/utils";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import "@/lib/amplify";
import { useAuthStore } from "@/stores/auth-store";

export default function AuthCallbackPage() {
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

    // OAuth listener (enabled in amplify.ts) exchanges ?code= on this URL, then Hub fires.
    const retryTimer = window.setTimeout(() => {
      void finishSignIn();
    }, 1500);

    return () => {
      window.clearTimeout(retryTimer);
      unsubscribe();
    };
  }, [fetchMe, router]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 px-4">
        <p className="max-w-md text-center text-sm text-red-600">{error}</p>
        <a href="/login" className="text-sm text-gray-700 underline">
          Back to login
        </a>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <p className="text-sm text-gray-600">Completing sign-in...</p>
    </div>
  );
}
