import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useRef } from "react";

export function QueryProvider({ children }: { children: ReactNode }) {
  const clientRef = useRef(
    new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 1000 * 30,
          retry: 1,
          refetchOnWindowFocus: false,
        },
      },
    }),
  );

  return (
    <QueryClientProvider client={clientRef.current}>{children}</QueryClientProvider>
  );
}
