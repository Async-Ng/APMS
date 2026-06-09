"use client";

import { fetchAuthSession } from "aws-amplify/auth";
import { Hub } from "aws-amplify/utils";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import "@/lib/amplify";
import { BrutalCard } from "@/components/ui/BrutalCard";
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
          setError("Đăng nhập không thành công. Vui lòng thử lại.");
          return;
        }

        finishedRef.current = true;
        await fetchMe();
        router.replace("/drive");
      } catch (err) {
        setError("Không thể hoàn tất đăng nhập. Vui lòng thử lại.");
      }
    }

    const unsubscribe = Hub.listen("auth", ({ payload }) => {
      if (payload.event === "signInWithRedirect") {
        void finishSignIn();
        return;
      }

      if (payload.event === "signInWithRedirect_failure") {
        const data = payload.data as { message?: string } | undefined;
        setError("Đăng nhập thất bại. Vui lòng thử lại.");
      }
    });

    const retryTimer = window.setTimeout(() => {
      void finishSignIn();
    }, 1500);

    return () => {
      window.clearTimeout(retryTimer);
      unsubscribe();
    };
  }, [fetchMe, router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-brutal-bg px-4">
      <BrutalCard className="max-w-md text-center">
        {error ? (
          <div className="space-y-4">
            <p className="rounded-lg border-2 border-brutal-ink bg-brutal-accent/30 px-3 py-2 text-sm font-medium text-brutal-ink">
              {error}
            </p>
            <Link
              href="/login"
              className="focus-brutal inline-block font-heading font-bold underline underline-offset-4"
            >
              Back to login
            </Link>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-2">
            <Loader2
              className="h-8 w-8 animate-spin text-brutal-ink"
              aria-hidden="true"
            />
            <p className="font-heading text-lg font-extrabold">Completing sign-in...</p>
            <p className="text-sm text-brutal-muted">Please wait a moment.</p>
          </div>
        )}
      </BrutalCard>
    </main>
  );
}
