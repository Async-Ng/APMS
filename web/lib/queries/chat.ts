import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { useCallback, useRef } from "react";

import { api } from "@/lib/api-client";
import {
  filterVisibleChatSessions,
  isDeletedContextTitle,
  MISSING_DOC_TITLE,
} from "@/lib/chat-visibility";
import { parseFetchErrorBody } from "@/lib/errors";

/* ── Types ─────────────────────────────────────────────────── */

export type ChatContextType = "all" | "folder" | "document" | "documents";

export type ChatMode = "chat" | "summary" | "faq" | "study_guide";

export interface ChatCitation {
  sourceIndex?: number;
  documentId: string;
  documentTitle: string;
  chunkIndex: number | null;
  pageNumber: number | null;
  sectionPath?: string[];
  heading?: string | null;
  blockType?: string;
  extractionMode?: string;
  extractionConfidence?: string;
  excerpt: string;
  deepLink?: string;
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
  suggestedQuestions?: string[];
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

export function invalidateChatSessions(qc: QueryClient) {
  void qc.invalidateQueries({ queryKey: chatKeys.sessions });
}

export function evictChatSessionsForTrashedDocument(
  qc: QueryClient,
  documentId: string,
) {
  qc.setQueryData<ChatSession[]>(chatKeys.sessions, (old) => {
    if (!old) return old;
    return old
      .map((session) => {
        if (session.contextType !== "documents") return session;
        const contextIds = session.contextIds ?? [];
        if (!contextIds.includes(documentId)) return session;
        const nextIds = contextIds.filter((id) => id !== documentId);
        const nextDocs = (session.contextDocuments ?? []).filter(
          (doc) => doc.id !== documentId,
        );
        return {
          ...session,
          contextIds: nextIds,
          contextDocuments: nextDocs,
        };
      })
      .filter((session) => {
        if (session.contextType === "document" && session.contextId === documentId) {
          return false;
        }
        if (session.contextType === "documents") {
          const docs = session.contextDocuments ?? [];
          if (docs.length === 0) return !isDeletedContextTitle(session.contextLabel);
          return docs.some((doc) => !isDeletedContextTitle(doc.title));
        }
        return true;
      });
  });

  for (const [key, data] of qc.getQueriesData<ChatSessionDetail>({
    queryKey: ["chat", "sessions"],
  })) {
    if (!data || typeof key[2] !== "string") continue;
    const sessionId = key[2];
    const usesDocument =
      (data.contextType === "document" && data.contextId === documentId) ||
      (data.contextType === "documents" &&
        (data.contextIds ?? []).includes(documentId));
    if (usesDocument) {
      qc.removeQueries({ queryKey: chatKeys.session(sessionId) });
    }
  }
}

export function evictChatSessionsForTrashedFolder(
  qc: QueryClient,
  folderId: string,
) {
  qc.setQueryData<ChatSession[]>(chatKeys.sessions, (old) =>
    old?.filter(
      (session) =>
        !(session.contextType === "folder" && session.contextId === folderId),
    ),
  );

  for (const [key, data] of qc.getQueriesData<ChatSessionDetail>({
    queryKey: ["chat", "sessions"],
  })) {
    if (!data || typeof key[2] !== "string") continue;
    if (data.contextType === "folder" && data.contextId === folderId) {
      qc.removeQueries({ queryKey: chatKeys.session(key[2]) });
    }
  }
}

/* ── Queries ───────────────────────────────────────────────── */

export function useChatSessions() {
  return useQuery({
    queryKey: chatKeys.sessions,
    queryFn: async () => {
      const res = await api.get<{ status: string; data: ChatSession[] }>(
        "/chat/sessions",
      );
      return filterVisibleChatSessions(res.data.data);
    },
    refetchOnWindowFocus: true,
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

/** True when the request failed because the user pressed Stop (AbortController). */
export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function makeOptimisticMessages(sessionId: string, userContent: string) {
  const optimisticUser: ChatMessage = {
    id: `optimistic-${Date.now()}`,
    sessionId,
    role: "user",
    content: userContent,
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
  return { optimisticUser, streamingAssistant };
}

function makeChunkCacheUpdater(qc: QueryClient, sessionId: string) {
  let streamedContent = "";
  return (text: string) => {
    streamedContent += text;
    const current = qc.getQueryData<ChatSessionDetail>(chatKeys.session(sessionId));
    if (!current) return;

    const messages = [...current.messages];
    const last = messages.at(-1);
    if (last?.role === "assistant" && last.id.startsWith("streaming-")) {
      messages[messages.length - 1] = { ...last, content: streamedContent };
    }

    qc.setQueryData<ChatSessionDetail>(chatKeys.session(sessionId), {
      ...current,
      messages,
    });
  };
}

function finalizeStreamedExchange(
  qc: QueryClient,
  sessionId: string,
  data: SendMessageResult,
  context: { optimisticId?: string; streamingId?: string } | undefined,
) {
  const current = qc.getQueryData<ChatSessionDetail>(chatKeys.session(sessionId));
  if (!current) return;

  const withoutTransient = current.messages.filter(
    (m) =>
      m.id !== context?.optimisticId &&
      m.id !== context?.streamingId &&
      m.id !== data.userMessage.id,
  );

  qc.setQueryData<ChatSessionDetail>(chatKeys.session(sessionId), {
    ...current,
    messages: [...withoutTransient, data.userMessage, data.assistantMessage],
    updatedAt: data.assistantMessage.createdAt,
  });

  void qc.invalidateQueries({ queryKey: chatKeys.sessions });
}

/**
 * After Stop, the server persists the partial answer; refetch shortly after so
 * the cache reconciles with what was actually saved.
 */
function reconcileAfterAbort(qc: QueryClient, sessionId: string) {
  window.setTimeout(() => {
    void qc.invalidateQueries({ queryKey: chatKeys.session(sessionId) });
    void qc.invalidateQueries({ queryKey: chatKeys.sessions });
  }, 1000);
}

export function useSendMessage(sessionId: string) {
  const qc = useQueryClient();
  const abortRef = useRef<AbortController | null>(null);

  const mutation = useMutation({
    mutationFn: async (input: SendMessageInput) => {
      const controller = new AbortController();
      abortRef.current = controller;
      return streamChatRequest(
        `/chat/sessions/${sessionId}/messages/stream`,
        { content: input.content, mode: input.mode ?? "chat" },
        makeChunkCacheUpdater(qc, sessionId),
        controller.signal,
      );
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

      const { optimisticUser, streamingAssistant } = makeOptimisticMessages(
        sessionId,
        displayContent,
      );

      if (previous) {
        qc.setQueryData<ChatSessionDetail>(chatKeys.session(sessionId), {
          ...previous,
          messages: [...previous.messages, optimisticUser, streamingAssistant],
        });
      }

      return { previous, optimisticId: optimisticUser.id, streamingId: streamingAssistant.id };
    },
    onError: (err, _input, context) => {
      if (isAbortError(err)) {
        reconcileAfterAbort(qc, sessionId);
        return;
      }
      if (context?.previous) {
        qc.setQueryData(chatKeys.session(sessionId), context.previous);
      }
    },
    onSuccess: (data, _input, context) => {
      finalizeStreamedExchange(qc, sessionId, data, context);
    },
    onSettled: () => {
      abortRef.current = null;
    },
  });

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { ...mutation, stop };
}

/** Regenerates the answer to the session's latest question (counts one daily turn). */
export function useRegenerateMessage(sessionId: string) {
  const qc = useQueryClient();
  const abortRef = useRef<AbortController | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const controller = new AbortController();
      abortRef.current = controller;
      return streamChatRequest(
        `/chat/sessions/${sessionId}/regenerate/stream`,
        {},
        makeChunkCacheUpdater(qc, sessionId),
        controller.signal,
      );
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: chatKeys.session(sessionId) });

      const previous = qc.getQueryData<ChatSessionDetail>(
        chatKeys.session(sessionId),
      );

      const { streamingAssistant } = makeOptimisticMessages(sessionId, "");

      if (previous) {
        // Drop assistant answers after the last user message, then stream anew.
        const lastUserIndex = previous.messages.findLastIndex(
          (m) => m.role === "user",
        );
        const messages =
          lastUserIndex >= 0
            ? previous.messages.slice(0, lastUserIndex + 1)
            : [...previous.messages];
        qc.setQueryData<ChatSessionDetail>(chatKeys.session(sessionId), {
          ...previous,
          messages: [...messages, streamingAssistant],
        });
      }

      return { previous, streamingId: streamingAssistant.id };
    },
    onError: (err, _input, context) => {
      if (isAbortError(err)) {
        reconcileAfterAbort(qc, sessionId);
        return;
      }
      if (context?.previous) {
        qc.setQueryData(chatKeys.session(sessionId), context.previous);
      }
    },
    onSuccess: (data, _input, context) => {
      finalizeStreamedExchange(qc, sessionId, data, context);
    },
    onSettled: () => {
      abortRef.current = null;
    },
  });

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { ...mutation, stop };
}

export interface EditMessageInput {
  messageId: string;
  content: string;
}

/** Edits a sent question and re-asks it; messages after it are replaced. */
export function useEditMessage(sessionId: string) {
  const qc = useQueryClient();
  const abortRef = useRef<AbortController | null>(null);

  const mutation = useMutation({
    mutationFn: async (input: EditMessageInput) => {
      const controller = new AbortController();
      abortRef.current = controller;
      return streamChatRequest(
        `/chat/sessions/${sessionId}/messages/${input.messageId}/edit/stream`,
        { content: input.content },
        makeChunkCacheUpdater(qc, sessionId),
        controller.signal,
      );
    },
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: chatKeys.session(sessionId) });

      const previous = qc.getQueryData<ChatSessionDetail>(
        chatKeys.session(sessionId),
      );

      const { optimisticUser, streamingAssistant } = makeOptimisticMessages(
        sessionId,
        input.content,
      );

      if (previous) {
        const targetIndex = previous.messages.findIndex(
          (m) => m.id === input.messageId,
        );
        const kept =
          targetIndex >= 0
            ? previous.messages.slice(0, targetIndex)
            : [...previous.messages];
        qc.setQueryData<ChatSessionDetail>(chatKeys.session(sessionId), {
          ...previous,
          messages: [...kept, optimisticUser, streamingAssistant],
        });
      }

      return { previous, optimisticId: optimisticUser.id, streamingId: streamingAssistant.id };
    },
    onError: (err, _input, context) => {
      if (isAbortError(err)) {
        reconcileAfterAbort(qc, sessionId);
        return;
      }
      if (context?.previous) {
        qc.setQueryData(chatKeys.session(sessionId), context.previous);
      }
    },
    onSuccess: (data, _input, context) => {
      finalizeStreamedExchange(qc, sessionId, data, context);
    },
    onSettled: () => {
      abortRef.current = null;
    },
  });

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { ...mutation, stop };
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

async function streamChatRequest(
  path: string,
  body: Record<string, unknown>,
  onChunk: (text: string) => void,
  signal?: AbortSignal,
): Promise<SendMessageResult> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
  const headers = await getAuthHeaders();

  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    ...(signal ? { signal } : {}),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(parseFetchErrorBody(response.status, errBody));
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
