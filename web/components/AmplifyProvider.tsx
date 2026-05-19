"use client";

import "@/lib/amplify";

export function AmplifyProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
