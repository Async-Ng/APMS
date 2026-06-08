import { useQuery } from "@tanstack/react-query";

import { api } from "../lib/api-client";

export interface SearchResult {
  id: string;
  documentId: string;
  documentTitle: string;
  excerpt: string;
  score: number;
  pageNumber: number | null;
}

export function useSearch(query: string) {
  return useQuery({
    queryKey: ["search", query],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: SearchResult[] }>("/search", {
        params: { q: query.trim(), limit: 20 },
      });
      return res.data.data;
    },
    enabled: query.trim().length > 2,
    staleTime: 0,
  });
}
