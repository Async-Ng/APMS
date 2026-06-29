import { useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

import {
  chatKeys,
  useChatSessions,
  type ChatMessage,
  type ChatSessionDetail,
} from "@/lib/queries/chat";

export const CHAT_DAILY_LIMIT = 50;

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getUTCFullYear() === now.getUTCFullYear() &&
    d.getUTCMonth() === now.getUTCMonth() &&
    d.getUTCDate() === now.getUTCDate()
  );
}

function countUserMessagesToday(messages: ChatMessage[]): number {
  return messages.filter((m) => m.role === "user" && isToday(m.createdAt)).length;
}

/** Estimate today's chat usage from cached session details (best-effort for UI). */
export function useChatDailyUsage() {
  const qc = useQueryClient();
  const { data: sessions } = useChatSessions();

  const used = useMemo(() => {
    if (!sessions?.length) return 0;
    let total = 0;
    for (const session of sessions) {
      const detail = qc.getQueryData<ChatSessionDetail>(chatKeys.session(session.id));
      if (detail?.messages) {
        total += countUserMessagesToday(detail.messages);
      }
    }
    return total;
  }, [sessions, qc]);

  const remaining = Math.max(0, CHAT_DAILY_LIMIT - used);

  return {
    used,
    limit: CHAT_DAILY_LIMIT,
    remaining,
    isNearLimit: remaining <= 10,
    isExhausted: remaining === 0,
  };
}
