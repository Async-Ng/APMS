import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import type {
  ForumDocument,
  ForumDocumentsResponse,
  ForumListParams,
} from "@/lib/queries/internal-documents";

export type {
  ForumDocument,
  ForumDocumentsResponse,
  ForumListParams,
  ForumMatchType,
  InternalSource,
} from "@/lib/queries/internal-documents";

export function useForumDocuments(
  params: ForumListParams & { enabled?: boolean },
) {
  const { enabled = true, ...queryParams } = params;
  return useQuery({
    queryKey: ["forum", "documents", queryParams],
    queryFn: async () => {
      const res = await api.get<{
        status: string;
        data: ForumDocumentsResponse;
      }>("/forum/documents", { params: queryParams });
      return res.data.data;
    },
    placeholderData: (prev) => prev,
    enabled,
  });
}

export function useForumDocument(
  documentId: string,
  options?: { download?: boolean; enabled?: boolean },
) {
  const download = options?.download ?? false;
  return useQuery({
    queryKey: ["forum", "documents", documentId, { download }],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: ForumDocument }>(
        `/forum/documents/${documentId}`,
        { params: download ? { download: "true" } : undefined },
      );
      return res.data.data;
    },
    enabled: (options?.enabled ?? true) && !!documentId,
  });
}
