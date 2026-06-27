import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "../lib/api-client";
import { getErrorMessage } from "../lib/api-error";
import { useToastStore } from "../stores/toast-store";

export interface ChatSession {
  id: string;
  title: string;
  contextType: "all" | "folder" | "document" | "documents";
  contextId: string | null;
  isPinned: boolean;
  pinnedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Citation {
  documentId: string;
  documentTitle: string;
  pageNumber: number | null;
  excerpt: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  citations: Citation[];
  createdAt: string;
}

export interface SessionWithMessages extends ChatSession {
  messages: ChatMessage[];
}

export function useChatSessions() {
  return useQuery({
    queryKey: ["chat", "sessions"],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: ChatSession[] }>("/chat/sessions");
      return res.data.data;
    },
  });
}

export function useChatSession(sessionId: string) {
  return useQuery({
    queryKey: ["chat", "session", sessionId],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: SessionWithMessages }>(
        `/chat/sessions/${sessionId}`,
      );
      return res.data.data;
    },
  });
}

export function useCreateChatSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      title?: string;
      contextType: "all" | "folder" | "document";
      contextId?: string;
    }) => {
      const res = await api.post<{ status: string; data: ChatSession }>("/chat/sessions", data);
      return res.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["chat", "sessions"] });
    },
  });
}

export function useDeleteChatSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      await api.delete(`/chat/sessions/${sessionId}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["chat", "sessions"] });
    },
  });
}

export interface UpdateChatSessionBody {
  title?: string;
  isPinned?: boolean;
}

export function useUpdateChatSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      sessionId,
      body,
    }: {
      sessionId: string;
      body: UpdateChatSessionBody;
    }) => {
      const res = await api.patch<{ status: string; data: ChatSession }>(
        `/chat/sessions/${sessionId}`,
        body,
      );
      return res.data.data;
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["chat", "sessions"] });
      queryClient.setQueryData<SessionWithMessages>(["chat", "session", data.id], (old) =>
        old ? { ...old, ...data } : old,
      );
    },
  });
}

interface SendMessageResult {
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { fetchAuthSession } = await import("aws-amplify/auth");
  const session = await fetchAuthSession();
  const idToken = session.tokens?.idToken?.toString();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (idToken) headers.Authorization = `Bearer ${idToken}`;
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

/**
 * Reads the SSE stream via XMLHttpRequest progress events — React Native's
 * fetch() does not reliably expose a readable response body, but `xhr.responseText`
 * grows incrementally and fires `readystatechange` at readyState 3 (LOADING).
 */
function streamChatMessage(
  sessionId: string,
  content: string,
  onChunk: (text: string) => void,
): Promise<SendMessageResult> {
  return new Promise((resolve, reject) => {
    void (async () => {
      const baseUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000/api";
      const headers = await getAuthHeaders();

      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${baseUrl}/chat/sessions/${sessionId}/messages/stream`);
      for (const [key, value] of Object.entries(headers)) {
        xhr.setRequestHeader(key, value);
      }

      let processedLength = 0;
      let buffer = "";
      let result: SendMessageResult | null = null;
      let settled = false;

      xhr.onreadystatechange = () => {
        if (xhr.readyState >= 3 && xhr.responseText.length > processedLength) {
          buffer += xhr.responseText.slice(processedLength);
          processedLength = xhr.responseText.length;

          const { events, rest } = parseSseEvents(buffer);
          buffer = rest;

          for (const { event, data } of events) {
            try {
              const payload = JSON.parse(data) as Record<string, unknown>;
              if (event === "chunk" && typeof payload.text === "string") {
                onChunk(payload.text);
              } else if (event === "done") {
                result = payload as unknown as SendMessageResult;
              } else if (event === "error" && !settled) {
                settled = true;
                reject(new Error(typeof payload.message === "string" ? payload.message : "Stream failed"));
                xhr.abort();
              }
            } catch {
              // Ignore a malformed/partial event — next chunk will complete the buffer.
            }
          }
        }

        if (xhr.readyState === 4 && !settled) {
          settled = true;
          if (xhr.status >= 200 && xhr.status < 300) {
            if (result) resolve(result);
            else reject(new Error("Stream ended without a final response"));
          } else {
            reject(new Error(`Request failed: ${xhr.status}`));
          }
        }
      };
      xhr.onerror = () => {
        if (!settled) {
          settled = true;
          reject(new Error("Network error"));
        }
      };
      xhr.send(JSON.stringify({ content, mode: "chat" }));
    })();
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ sessionId, content }: { sessionId: string; content: string }) => {
      let streamedContent = "";
      return streamChatMessage(sessionId, content, (text) => {
        streamedContent += text;
        const queryKey = ["chat", "session", sessionId];
        const current = queryClient.getQueryData<SessionWithMessages>(queryKey);
        if (!current) return;

        const messages = [...current.messages];
        const last = messages.at(-1);
        if (last?.role === "assistant" && last.id.startsWith("streaming-")) {
          messages[messages.length - 1] = { ...last, content: streamedContent };
        }

        queryClient.setQueryData<SessionWithMessages>(queryKey, { ...current, messages });
      });
    },
    onMutate: async ({ sessionId, content }) => {
      const queryKey = ["chat", "session", sessionId];
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<SessionWithMessages>(queryKey);

      const optimisticUser: ChatMessage = {
        id: `optimistic-${Date.now()}`,
        sessionId,
        role: "user",
        content,
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

      queryClient.setQueryData<SessionWithMessages>(queryKey, (old) =>
        old ? { ...old, messages: [...old.messages, optimisticUser, streamingAssistant] } : old,
      );

      return { previous, optimisticId: optimisticUser.id, streamingId: streamingAssistant.id };
    },
    onSuccess: (data, { sessionId }, context) => {
      queryClient.setQueryData<SessionWithMessages>(["chat", "session", sessionId], (old) => {
        if (!old) return old;
        return {
          ...old,
          messages: [
            ...old.messages.filter((m) => m.id !== context?.optimisticId && m.id !== context?.streamingId),
            data.userMessage,
            data.assistantMessage,
          ],
        };
      });
    },
    onError: (err, { sessionId }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["chat", "session", sessionId], context.previous);
      }
      useToastStore.getState().show(getErrorMessage(err, "Gửi tin nhắn thất bại. Vui lòng thử lại."));
    },
  });
}
