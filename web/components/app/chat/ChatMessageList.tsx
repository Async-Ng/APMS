"use client";

import { CornerDownRight } from "lucide-react";
import { useEffect, useRef } from "react";

import { cn } from "@/lib/cn";
import type { ChatCitation, ChatMessage } from "@/lib/queries/chat";

import { ChatMessageContent } from "./ChatMessageContent";
import { ChatThinkingIndicator } from "./ChatThinkingIndicator";

interface ChatMessageListProps {
  messages: ChatMessage[];
  isThinking?: boolean;
  streamingMessageId?: string | null;
  activeMessageId?: string | null;
  onSelectCitation: (message: ChatMessage, citation: ChatCitation) => void;
  onSelectMessage: (message: ChatMessage) => void;
  onSuggestionClick?: (question: string) => void;
  isSending?: boolean;
}

export function ChatMessageList({
  messages,
  isThinking = false,
  streamingMessageId = null,
  activeMessageId,
  onSelectCitation,
  onSelectMessage,
  onSuggestionClick,
  isSending = false,
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
      {messages.map((message, index) => {
        const isUser = message.role === "user";
        const isActive = activeMessageId === message.id;
        const showSuggestions =
          !isUser &&
          index === messages.length - 1 &&
          message.id !== streamingMessageId &&
          !isSending &&
          !!onSuggestionClick &&
          (message.suggestedQuestions?.length ?? 0) > 0;

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

              {showSuggestions && (
                <div className="mt-3 flex flex-wrap gap-1.5 border-t border-brutal-ink/20 pt-2">
                  {message.suggestedQuestions?.map((question) => (
                    <button
                      key={question}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSuggestionClick?.(question);
                      }}
                      className="focus-brutal inline-flex max-w-full items-center gap-1 rounded-full border-2 border-brutal-ink bg-brutal-bg px-2 py-0.5 text-left text-xs font-semibold text-brutal-ink transition-colors hover:bg-brutal-accent/30"
                    >
                      <CornerDownRight className="h-3 w-3 shrink-0" />
                      <span className="truncate">{question}</span>
                    </button>
                  ))}
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
