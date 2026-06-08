import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "../lib/api-client";

export interface ChatSession {
  id: string;
  title: string;
  contextType: "all" | "folder" | "document";
  contextId: string | null;
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
    onSuccess: (data, { sessionId }) => {
      queryClient.setQueryData<SessionWithMessages>(["chat", "session", sessionId], (old) => {
        if (!old) return old;
        return {
          ...old,
          messages: [...old.messages, data.userMessage, data.assistantMessage],
        };
      });
    },
  });
}
