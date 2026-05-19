"use client";

import "@/lib/amplify";
import { signInWithRedirect } from "aws-amplify/auth";
import Link from "next/link";

export default function LoginPage() {
  async function handleGoogleSignIn() {
    await signInWithRedirect({ provider: "Google" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Sign in to APMS</h1>
        <p className="mb-6 text-sm text-gray-600">
          Use your Google account to access your academic documents.
        </p>
        <button
          type="button"
          onClick={() => void handleGoogleSignIn()}
          className="w-full rounded-lg bg-gray-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-gray-800"
        >
          Continue with Google
        </button>
        <p className="mt-4 text-center text-sm text-gray-500">
          <Link href="/" className="underline hover:text-gray-700">
            Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
