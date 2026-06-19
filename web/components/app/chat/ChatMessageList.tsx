"use client";

import { FileText } from "lucide-react";
import { useEffect, useRef } from "react";

import { cn } from "@/lib/cn";
import type { ChatCitation, ChatMessage } from "@/lib/queries/chat";

import { ChatMessageContent } from "./ChatMessageContent";
import { ChatThinkingIndicator } from "./ChatThinkingIndicator";

interface ChatMessageListProps {
  messages: ChatMessage[];
  isThinking?: boolean;
  streamingMessageId?: string | null;
  selectedCitationKey?: string | null;
  activeMessageId?: string | null;
  onSelectCitation: (message: ChatMessage, citation: ChatCitation) => void;
  onSelectMessage: (message: ChatMessage) => void;
}

function citationKey(c: ChatCitation): string {
  return `${c.documentId}-${c.pageNumber ?? "n"}-${c.excerpt.slice(0, 32)}`;
}

export function ChatMessageList({
  messages,
  isThinking = false,
  streamingMessageId = null,
  selectedCitationKey,
  activeMessageId,
  onSelectCitation,
  onSelectMessage,
}: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  if (messages.length === 0 && !isThinking) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
        <p className="font-heading text-lg font-extrabold text-brutal-ink">
          Bắt đầu cuộc trò chuyện
        </p>
        <p className="max-w-sm text-sm text-brutal-muted">
          Hỏi về nội dung tài liệu trong phạm vi nguồn đã chọn. Câu trả lời sẽ kèm
          trích dẫn bên phải.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain p-4 pb-2">
      {messages.map((message) => {
        const isUser = message.role === "user";
        const isActive = activeMessageId === message.id;

        return (
          <div
            key={message.id}
            className={cn("flex", isUser ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[85%] rounded-2xl border-2 border-brutal-ink px-4 py-3 shadow-brutal-sm",
                isUser
                  ? "rounded-br-sm bg-brutal-secondary text-white"
                  : "rounded-bl-sm bg-brutal-surface text-brutal-ink",
                !isUser &&
                  isActive &&
                  "ring-2 ring-brutal-primary ring-offset-2",
              )}
              role={!isUser && message.citations.length > 0 ? "button" : undefined}
              tabIndex={!isUser && message.citations.length > 0 ? 0 : undefined}
              onClick={() => {
                if (!isUser && message.citations.length > 0) {
                  onSelectMessage(message);
                }
              }}
              onKeyDown={(e) => {
                if (
                  !isUser &&
                  message.citations.length > 0 &&
                  (e.key === "Enter" || e.key === " ")
                ) {
                  e.preventDefault();
                  onSelectMessage(message);
                }
              }}
            >
              {isUser ? (
                <p className="whitespace-pre-wrap text-sm font-medium leading-relaxed">
                  {message.content}
                </p>
              ) : (
                <ChatMessageContent
                  content={message.content}
                  citations={message.citations}
                  isStreaming={message.id === streamingMessageId}
                  onCitationClick={(citation) => onSelectCitation(message, citation)}
                />
              )}

              {!isUser && message.citations.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5 border-t border-brutal-ink/20 pt-2">
                  {message.citations.map((citation, idx) => {
                    const key = citationKey(citation);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectCitation(message, citation);
                        }}
                        className={cn(
                          "focus-brutal inline-flex max-w-full items-center gap-1 rounded-full border-2 border-brutal-ink px-2 py-0.5 text-left text-xs font-semibold transition-colors",
                          selectedCitationKey === key
                            ? "bg-brutal-primary text-white"
                            : "bg-brutal-bg text-brutal-ink hover:bg-brutal-accent/30",
                        )}
                      >
                        <FileText className="h-3 w-3 shrink-0" />
                        <span className="truncate">
                          {citation.documentTitle}
                          {citation.pageNumber != null &&
                            ` · tr.${citation.pageNumber}`}
                        </span>
                        <span className="opacity-70">[{citation.sourceIndex ?? idx + 1}]</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {isThinking && <ChatThinkingIndicator />}
      <div ref={bottomRef} />
    </div>
  );
}
