import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-client";

/* ── Types ─────────────────────────────────────────────────── */

export type ChatContextType = "all" | "folder" | "document" | "documents";

export interface ChatCitation {
  documentId: string;
  documentTitle: string;
  pageNumber: number | null;
  excerpt: string;
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  contextType: ChatContextType;
  contextId: string | null;
  contextIds?: string[];
  contextLabel?: string | null;
  contextDocuments?: Array<{ id: string; title: string }>;
  isPinned: boolean;
  pinnedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  citations: ChatCitation[];
  createdAt: string;
}

export interface ChatSessionDetail extends ChatSession {
  messages: ChatMessage[];
}

export interface CreateSessionBody {
  title?: string;
  contextType: ChatContextType;
  contextId?: string;
  contextIds?: string[];
}

export interface SendMessageResult {
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
}

export interface UpdateSessionBody {
  title?: string;
  isPinned?: boolean;
}

export const chatKeys = {
  sessions: ["chat", "sessions"] as const,
  session: (id: string) => ["chat", "sessions", id] as const,
};

/* ── Queries ───────────────────────────────────────────────── */

export function useChatSessions() {
  return useQuery({
    queryKey: chatKeys.sessions,
    queryFn: async () => {
      const res = await api.get<{ status: string; data: ChatSession[] }>(
        "/chat/sessions",
      );
      return res.data.data;
    },
  });
}

export function useChatSession(sessionId: string | undefined) {
  return useQuery({
    queryKey: chatKeys.session(sessionId ?? ""),
    queryFn: async () => {
      const res = await api.get<{ status: string; data: ChatSessionDetail }>(
        `/chat/sessions/${sessionId}`,
      );
      return res.data.data;
    },
    enabled: !!sessionId,
  });
}

/* ── Mutations ─────────────────────────────────────────────── */

export function useCreateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateSessionBody) => {
      const res = await api.post<{ status: string; data: ChatSession }>(
        "/chat/sessions",
        body,
      );
      return res.data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: chatKeys.sessions });
    },
  });
}

export function useDeleteSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => api.delete(`/chat/sessions/${sessionId}`),
    onSuccess: (_data, sessionId) => {
      void qc.invalidateQueries({ queryKey: chatKeys.sessions });
      qc.removeQueries({ queryKey: chatKeys.session(sessionId) });
    },
  });
}

export function useUpdateSession(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: UpdateSessionBody) => {
      const res = await api.patch<{ status: string; data: ChatSession }>(
        `/chat/sessions/${sessionId}`,
        body,
      );
      return res.data.data;
    },
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: chatKeys.sessions });
      const current = qc.getQueryData<ChatSessionDetail>(
        chatKeys.session(sessionId),
      );
      if (current) {
        qc.setQueryData<ChatSessionDetail>(chatKeys.session(sessionId), {
          ...current,
          title: data.title,
          contextLabel: data.contextLabel,
          contextDocuments: data.contextDocuments,
          isPinned: data.isPinned,
          pinnedAt: data.pinnedAt,
          updatedAt: data.updatedAt,
        });
      } else {
        void qc.invalidateQueries({ queryKey: chatKeys.session(sessionId) });
      }
    },
  });
}

const MISSING_DOC_TITLE = "Tài liệu không còn tồn tại";

/** Fetch document titles for chat context IDs (when session snapshot is incomplete). */
export function useContextDocumentDetails(
  documentIds: string[],
  enabled: boolean,
) {
  return useQuery({
    queryKey: ["chat", "context-docs", documentIds],
    queryFn: async () => {
      const entries = await Promise.all(
        documentIds.map(async (id) => {
          try {
            const res = await api.get<{
              status: string;
              data: { id: string; title: string; originalFilename: string };
            }>(`/documents/${id}`);
            const d = res.data.data;
            const title =
              d.title?.trim() || d.originalFilename?.trim() || MISSING_DOC_TITLE;
            return { id, title };
          } catch {
            return { id, title: MISSING_DOC_TITLE };
          }
        }),
      );
      return entries;
    },
    enabled: enabled && documentIds.length > 0,
    staleTime: 60_000,
  });
}

export function useSendMessage(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (content: string) => {
      const res = await api.post<{ status: string; data: SendMessageResult }>(
        `/chat/sessions/${sessionId}/messages`,
        { content },
      );
      return res.data.data;
    },
    onMutate: async (content) => {
      await qc.cancelQueries({ queryKey: chatKeys.session(sessionId) });

      const previous = qc.getQueryData<ChatSessionDetail>(
        chatKeys.session(sessionId),
      );

      const optimisticUser: ChatMessage = {
        id: `optimistic-${Date.now()}`,
        sessionId,
        role: "user",
        content,
        citations: [],
        createdAt: new Date().toISOString(),
      };

      if (previous) {
        qc.setQueryData<ChatSessionDetail>(chatKeys.session(sessionId), {
          ...previous,
          messages: [...previous.messages, optimisticUser],
        });
      }

      return { previous, optimisticId: optimisticUser.id };
    },
    onError: (_err, _content, context) => {
      if (context?.previous) {
        qc.setQueryData(chatKeys.session(sessionId), context.previous);
      }
    },
    onSuccess: (data, _content, context) => {
      const current = qc.getQueryData<ChatSessionDetail>(
        chatKeys.session(sessionId),
      );
      if (!current) return;

      const withoutOptimistic = current.messages.filter(
        (m) => m.id !== context?.optimisticId,
      );

      qc.setQueryData<ChatSessionDetail>(chatKeys.session(sessionId), {
        ...current,
        messages: [
          ...withoutOptimistic,
          data.userMessage,
          data.assistantMessage,
        ],
        updatedAt: data.assistantMessage.createdAt,
      });

      void qc.invalidateQueries({ queryKey: chatKeys.sessions });
    },
  });
}

export { getApiErrorMessage, getUserErrorMessage } from "@/lib/errors";
