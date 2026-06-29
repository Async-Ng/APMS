import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api-client";

export interface SemanticSearchResult {
  documentId: string;
  documentTitle: string;
  excerpt: string;
  pageNumber: number | null;
  score: number;
  sectionPath: string[];
  heading: string | null;
}

export const searchKeys = {
  all: ["search"] as const,
  query: (q: string) => ["search", q] as const,
};

export function useSemanticSearch(query: string, enabled = true) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: searchKeys.query(trimmed),
    queryFn: async () => {
      const res = await api.get<{
        status: string;
        data: { results: SemanticSearchResult[] };
      }>("/search", { params: { q: trimmed, limit: 20 } });
      return res.data.data.results;
    },
    enabled: enabled && trimmed.length >= 2,
    staleTime: 30_000,
  });
}
