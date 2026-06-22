import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import type {
  InternalDocument,
  InternalDocumentsResponse,
  InternalListParams,
} from "@/lib/queries/internal-documents";

export function useLibraryDocuments(
  params: InternalListParams & { enabled?: boolean },
) {
  const { enabled = true, ...queryParams } = params;
  return useQuery({
    queryKey: ["library", "documents", queryParams],
    queryFn: async () => {
      const res = await api.get<{
        status: string;
        data: InternalDocumentsResponse;
      }>("/library/documents", { params: queryParams });
      return res.data.data;
    },
    placeholderData: (prev) => prev,
    enabled,
  });
}

export function useLibraryDocument(
  documentId: string,
  options?: { download?: boolean; enabled?: boolean },
) {
  const download = options?.download ?? false;
  return useQuery({
    queryKey: ["library", "documents", documentId, { download }],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: InternalDocument }>(
        `/library/documents/${documentId}`,
        { params: download ? { download: "true" } : undefined },
      );
      return res.data.data;
    },
    enabled: (options?.enabled ?? true) && !!documentId,
  });
}
