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

export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ sessionId, content }: { sessionId: string; content: string }) => {
      const res = await api.post<{
        status: string;
        data: { userMessage: ChatMessage; assistantMessage: ChatMessage };
      }>(`/chat/sessions/${sessionId}/messages`, { content });
      return res.data.data;
    },
    onMutate: async ({ sessionId, content }) => {
      const queryKey = ["chat", "session", sessionId];
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<SessionWithMessages>(queryKey);

      const optimisticMessage: ChatMessage = {
        id: `optimistic-${Date.now()}`,
        sessionId,
        role: "user",
        content,
        citations: [],
        createdAt: new Date().toISOString(),
      };

      queryClient.setQueryData<SessionWithMessages>(queryKey, (old) =>
        old ? { ...old, messages: [...old.messages, optimisticMessage] } : old,
      );

      return { previous, optimisticId: optimisticMessage.id };
    },
    onSuccess: (data, { sessionId }, context) => {
      queryClient.setQueryData<SessionWithMessages>(["chat", "session", sessionId], (old) => {
        if (!old) return old;
        return {
          ...old,
          messages: [
            ...old.messages.filter((m) => m.id !== context?.optimisticId),
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
