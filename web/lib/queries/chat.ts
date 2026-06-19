import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-client";

/* ── Types ─────────────────────────────────────────────────── */

export type ChatContextType = "all" | "folder" | "document" | "documents";

export type ChatMode = "chat" | "summary" | "faq" | "study_guide";

export interface ChatCitation {
  sourceIndex?: number;
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

export interface SendMessageInput {
  content: string;
  mode?: ChatMode;
}

export const CHAT_PRESET_LABELS: Record<Exclude<ChatMode, "chat">, string> = {
  summary: "Tóm tắt",
  faq: "FAQ",
  study_guide: "Study guide",
};

export const CHAT_PRESET_CONTENT: Record<Exclude<ChatMode, "chat">, string> = {
  summary: "Tóm tắt toàn bộ nội dung tài liệu đã chọn.",
  faq: "Tạo bảng câu hỏi thường gặp (FAQ) từ tài liệu.",
  study_guide: "Tạo study guide (hướng dẫn ôn tập) từ tài liệu.",
};

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

interface ContextDocumentStatus {
  id: string;
  status: "pending" | "processing" | "ready" | "failed";
  chunkCount: number;
}

/** Poll processing status for chat context documents, so the UI can show a "still processing" banner. */
export function useChatContextStatus(documentIds: string[]) {
  return useQuery({
    queryKey: ["chat", "context-status", documentIds],
    queryFn: async () => {
      const entries = await Promise.all(
        documentIds.map(async (id) => {
          try {
            const res = await api.get<{
              status: string;
              data: { id: string; status: ContextDocumentStatus["status"]; chunkCount?: number };
            }>(`/documents/${id}`);
            const d = res.data.data;
            return { id, status: d.status, chunkCount: d.chunkCount ?? 0 };
          } catch {
            return null;
          }
        }),
      );
      return entries.filter((e): e is ContextDocumentStatus => e !== null);
    },
    enabled: documentIds.length > 0,
    refetchInterval: (query) =>
      query.state.data?.some((d) => d.status === "processing") ? 7_000 : false,
  });
}

export function useSendMessage(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SendMessageInput) => {
      let streamedContent = "";

      return streamChatMessage(sessionId, input, (text) => {
        streamedContent += text;
        const current = qc.getQueryData<ChatSessionDetail>(
          chatKeys.session(sessionId),
        );
        if (!current) return;

        const messages = [...current.messages];
        const last = messages.at(-1);
        if (last?.role === "assistant" && last.id.startsWith("streaming-")) {
          messages[messages.length - 1] = {
            ...last,
            content: streamedContent,
          };
        }

        qc.setQueryData<ChatSessionDetail>(chatKeys.session(sessionId), {
          ...current,
          messages,
        });
      });
    },
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: chatKeys.session(sessionId) });

      const previous = qc.getQueryData<ChatSessionDetail>(
        chatKeys.session(sessionId),
      );

      const displayContent =
        input.mode && input.mode !== "chat"
          ? input.content.trim() || CHAT_PRESET_CONTENT[input.mode]
          : input.content;

      const optimisticUser: ChatMessage = {
        id: `optimistic-${Date.now()}`,
        sessionId,
        role: "user",
        content: displayContent,
        citations: [],
        createdAt: new Date().toISOString(),
      };

      const streamingAssistant: ChatMessage = {
        id: `streaming-${Date.now()}`,
        sessionId,
        role: "assistant",
        content: "",
        citations: [],
        createdAt: new Date().toISOString(),
      };

      if (previous) {
        qc.setQueryData<ChatSessionDetail>(chatKeys.session(sessionId), {
          ...previous,
          messages: [...previous.messages, optimisticUser, streamingAssistant],
        });
      }

      return { previous, optimisticId: optimisticUser.id, streamingId: streamingAssistant.id };
    },
    onError: (_err, _input, context) => {
      if (context?.previous) {
        qc.setQueryData(chatKeys.session(sessionId), context.previous);
      }
    },
    onSuccess: (data, _input, context) => {
      const current = qc.getQueryData<ChatSessionDetail>(
        chatKeys.session(sessionId),
      );
      if (!current) return;

      const withoutOptimistic = current.messages.filter(
        (m) =>
          m.id !== context?.optimisticId && m.id !== context?.streamingId,
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

async function getAuthHeaders(): Promise<HeadersInit> {
  const { fetchAuthSession } = await import("aws-amplify/auth");
  const session = await fetchAuthSession();
  const idToken = session.tokens?.idToken?.toString();
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (idToken) {
    headers.Authorization = `Bearer ${idToken}`;
  }
  return headers;
}

function parseSseEvents(buffer: string): {
  events: Array<{ event: string; data: string }>;
  rest: string;
} {
  const events: Array<{ event: string; data: string }> = [];
  const parts = buffer.split("\n\n");
  const rest = parts.pop() ?? "";

  for (const part of parts) {
    if (!part.trim()) continue;
    let event = "message";
    let data = "";
    for (const line of part.split("\n")) {
      if (line.startsWith("event: ")) event = line.slice(7);
      if (line.startsWith("data: ")) data = line.slice(6);
    }
    if (data) events.push({ event, data });
  }

  return { events, rest };
}

async function streamChatMessage(
  sessionId: string,
  input: SendMessageInput,
  onChunk: (text: string) => void,
): Promise<SendMessageResult> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
  const headers = await getAuthHeaders();

  const response = await fetch(`${baseUrl}/chat/sessions/${sessionId}/messages/stream`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      content: input.content,
      mode: input.mode ?? "chat",
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(errBody || `Stream request failed (${response.status})`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Streaming is not supported in this browser");
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let result: SendMessageResult | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const { events, rest } = parseSseEvents(buffer);
    buffer = rest;

    for (const { event, data } of events) {
      const payload = JSON.parse(data) as Record<string, unknown>;

      if (event === "chunk" && typeof payload.text === "string") {
        onChunk(payload.text);
      } else if (event === "done") {
        result = payload as unknown as SendMessageResult;
      } else if (event === "error") {
        throw new Error(
          typeof payload.message === "string" ? payload.message : "Stream failed",
        );
      }
    }
  }

  if (!result) {
    throw new Error("Stream ended without a final response");
  }

  return result;
}

export { getApiErrorMessage, getUserErrorMessage } from "@/lib/errors";
