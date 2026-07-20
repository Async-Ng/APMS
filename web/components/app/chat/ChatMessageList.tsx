"use client";

import { ArrowDown, Check, Copy, CornerDownRight, Pencil, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

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
  onRegenerate?: () => void;
  onEditMessage?: (messageId: string, content: string) => void;
  isSending?: boolean;
}

/** Distance (px) from the bottom within which auto-scroll stays active. */
const AT_BOTTOM_THRESHOLD = 80;

function CopyMessageButton({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      void navigator.clipboard.writeText(content).then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      });
    },
    [content],
  );

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="focus-brutal inline-flex items-center gap-1 rounded-md border border-brutal-ink/30 bg-brutal-bg px-1.5 py-0.5 text-[11px] font-semibold text-brutal-muted transition-colors hover:bg-brutal-accent/30 hover:text-brutal-ink"
      title="Sao chép nội dung"
      aria-label="Sao chép nội dung"
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? "Đã chép" : "Chép"}
    </button>
  );
}

export function ChatMessageList({
  messages,
  isThinking = false,
  streamingMessageId = null,
  activeMessageId,
  onSelectCitation,
  onSelectMessage,
  onSuggestionClick,
  onRegenerate,
  onEditMessage,
  isSending = false,
}: ChatMessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    const atBottom = distance <= AT_BOTTOM_THRESHOLD;
    isAtBottomRef.current = atBottom;
    setShowScrollDown(!atBottom);
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    bottomRef.current?.scrollIntoView({ behavior });
  }, []);

  // Follow new content only while the user is pinned to the bottom, so
  // scrolling up to reread is never fought by the stream.
  useEffect(() => {
    if (isAtBottomRef.current) {
      scrollToBottom(streamingMessageId ? "auto" : "smooth");
    }
  }, [messages, isThinking, streamingMessageId, scrollToBottom]);

  const lastAssistantId = messages.findLast((m) => m.role === "assistant")?.id;

  const startEditing = useCallback((message: ChatMessage) => {
    setEditingId(message.id);
    setEditDraft(message.content);
  }, []);

  const submitEdit = useCallback(() => {
    const trimmed = editDraft.trim();
    if (!editingId || !trimmed || !onEditMessage) return;
    onEditMessage(editingId, trimmed);
    setEditingId(null);
    setEditDraft("");
  }, [editingId, editDraft, onEditMessage]);

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
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain p-4 pb-2"
      >
        {messages.map((message, index) => {
          const isUser = message.role === "user";
          const isActive = activeMessageId === message.id;
          const isStreamingThis = message.id === streamingMessageId;
          const isTransient =
            message.id.startsWith("optimistic-") || message.id.startsWith("streaming-");
          const showSuggestions =
            !isUser &&
            index === messages.length - 1 &&
            !isStreamingThis &&
            !isSending &&
            !!onSuggestionClick &&
            (message.suggestedQuestions?.length ?? 0) > 0;
          const showAssistantActions = !isUser && !isStreamingThis && !isTransient;
          const showUserActions =
            isUser && !isSending && !isTransient && !!onEditMessage;
          const isEditingThis = editingId === message.id;

          return (
            <div
              key={message.id}
              className={cn(
                "group flex flex-col gap-1 pb-3",
                isUser ? "items-end" : "items-start",
              )}
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
                  isEditingThis && "w-full",
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
                  isEditingThis ? (
                    <div className="flex flex-col gap-2">
                      <textarea
                        value={editDraft}
                        onChange={(e) => setEditDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            submitEdit();
                          }
                          if (e.key === "Escape") {
                            setEditingId(null);
                          }
                        }}
                        rows={Math.min(6, Math.max(2, editDraft.split("\n").length))}
                        autoFocus
                        className="focus-brutal w-full resize-none rounded-lg border-2 border-brutal-ink bg-brutal-bg px-2 py-1.5 text-sm font-medium text-brutal-ink outline-none"
                      />
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="focus-brutal rounded-md border border-brutal-ink/40 bg-brutal-bg px-2 py-0.5 text-xs font-semibold text-brutal-ink"
                        >
                          Hủy
                        </button>
                        <button
                          type="button"
                          onClick={submitEdit}
                          disabled={!editDraft.trim()}
                          className="focus-brutal rounded-md border border-brutal-ink bg-brutal-primary px-2 py-0.5 text-xs font-bold text-white disabled:opacity-50"
                        >
                          Lưu & gửi lại
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap text-sm font-medium leading-relaxed">
                      {message.content}
                    </p>
                  )
                ) : (
                  <ChatMessageContent
                    content={message.content}
                    citations={message.citations}
                    isStreaming={isStreamingThis}
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

              {showAssistantActions && (
                <div className="flex items-center gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 max-lg:opacity-100">
                  <CopyMessageButton content={message.content} />
                  {message.id === lastAssistantId && !isSending && onRegenerate && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRegenerate();
                      }}
                      className="focus-brutal inline-flex items-center gap-1 rounded-md border border-brutal-ink/30 bg-brutal-bg px-1.5 py-0.5 text-[11px] font-semibold text-brutal-muted transition-colors hover:bg-brutal-accent/30 hover:text-brutal-ink"
                      title="Tạo lại câu trả lời (tính 1 lượt)"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Tạo lại
                    </button>
                  )}
                </div>
              )}

              {showUserActions && !isEditingThis && (
                <div className="flex items-center gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 max-lg:opacity-100">
                  <CopyMessageButton content={message.content} />
                  <button
                    type="button"
                    onClick={() => startEditing(message)}
                    className="focus-brutal inline-flex items-center gap-1 rounded-md border border-brutal-ink/30 bg-brutal-bg px-1.5 py-0.5 text-[11px] font-semibold text-brutal-muted transition-colors hover:bg-brutal-accent/30 hover:text-brutal-ink"
                    title="Sửa câu hỏi và gửi lại (tính 1 lượt)"
                  >
                    <Pencil className="h-3 w-3" />
                    Sửa
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {isThinking && <ChatThinkingIndicator />}
        <div ref={bottomRef} />
      </div>

      {showScrollDown && (
        <button
          type="button"
          onClick={() => scrollToBottom("smooth")}
          className="focus-brutal absolute bottom-3 left-1/2 z-10 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full border-2 border-brutal-ink bg-brutal-surface text-brutal-ink shadow-brutal-sm transition-colors hover:bg-brutal-accent/40"
          aria-label="Cuộn xuống cuối"
          title="Cuộn xuống cuối"
        >
          <ArrowDown className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
