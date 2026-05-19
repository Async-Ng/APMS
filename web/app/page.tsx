"use client";

import { signOut } from "aws-amplify/auth";
import Link from "next/link";
import { useEffect } from "react";

import { useAuthStore } from "@/stores/auth-store";

export default function Home() {
  const { user, isLoading, fetchMe, clearUser } = useAuthStore();

  useEffect(() => {
    void fetchMe();
  }, [fetchMe]);

  async function handleSignOut() {
    await signOut();
    clearUser();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold text-gray-900">APMS</h1>
        <p className="mb-6 text-lg text-gray-600">Academic Personal Management System</p>

        {isLoading && <p className="text-sm text-gray-500">Loading...</p>}

        {!isLoading && user && (
          <div className="space-y-4">
            <p className="text-sm text-gray-700">
              Signed in as <span className="font-medium">{user.displayName}</span>
            </p>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Sign out
            </button>
          </div>
        )}

        {!isLoading && !user && (
          <Link
            href="/login"
            className="inline-block rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Sign in with Google
          </Link>
        )}
      </div>
    </div>
  );
}
