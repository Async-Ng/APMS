"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Topbar } from "@/components/app/Topbar";
import { BrutalButton } from "@/components/ui/BrutalButton";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { LoadingScreen } from "@/components/ui/Spinner";
import {
  filterVisibleCitations,
  isDeletedContextTitle,
} from "@/lib/chat-visibility";
import { cn } from "@/lib/cn";
import { useCreateSession, chatKeys } from "@/lib/queries/chat";
import { getUserErrorMessage } from "@/lib/errors";
import type { ChatCitation, ChatMessage, SendMessageInput } from "@/lib/queries/chat";
import {
  isAbortError,
  useChatContextStatus,
  useChatSession,
  useEditMessage,
  useRegenerateMessage,
  useSendMessage,
} from "@/lib/queries/chat";
import { useQueryClient } from "@tanstack/react-query";

import { ChatComposer } from "./ChatComposer";
import { ChatContextBadge } from "./ChatContextBadge";
import { ChatMessageList } from "./ChatMessageList";
import { ChatSessionList } from "./ChatSessionList";
import { ChatSessionPinButton } from "./ChatSessionPinButton";
import { ChatSourcePickerModal } from "./ChatSourcePickerModal";
import { CitationPanel } from "./CitationPanel";

type MobileTab = "sources" | "chat" | "citations";

interface ChatWorkspaceProps {
  sessionId?: string;
  isNewChat?: boolean;
  onSessionCreated: (id: string) => void;
}

export function ChatWorkspace({
  sessionId,
  isNewChat = false,
  onSessionCreated,
}: ChatWorkspaceProps) {
  const router = useRouter();
  const qc = useQueryClient();
  const [mobileTab, setMobileTab] = useState<MobileTab>("chat");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState<ChatCitation | null>(
    null,
  );
  const [activeMessage, setActiveMessage] = useState<ChatMessage | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const createSession = useCreateSession();

  const { data: session, isLoading, isError } = useChatSession(
    isNewChat ? undefined : sessionId,
  );
  const sendMessage = useSendMessage(sessionId ?? "");
  const regenerateMessage = useRegenerateMessage(sessionId ?? "");
  const editMessage = useEditMessage(sessionId ?? "");
  const isGenerating =
    sendMessage.isPending || regenerateMessage.isPending || editMessage.isPending;

  const contextDocumentIds =
    session?.contextType === "document" && session.contextId
      ? [session.contextId]
      : session?.contextType === "documents"
        ? session.contextIds ?? []
        : [];
  const { data: contextStatuses } = useChatContextStatus(contextDocumentIds);
  const isContextProcessing =
    contextStatuses?.some((d) => d.status === "processing") ?? false;

  const hiddenDocumentIds = useMemo(() => {
    if (!session) return new Set<string>();

    const contextIds =
      session.contextType === "document" && session.contextId
        ? [session.contextId]
        : session.contextType === "documents"
          ? session.contextIds ?? []
          : [];

    if (contextIds.length === 0) return new Set<string>();

    const loadedIds = new Set(contextStatuses?.map((d) => d.id) ?? []);
    const hidden = new Set<string>();

    for (const id of contextIds) {
      if (!loadedIds.has(id)) hidden.add(id);
    }

    for (const doc of session.contextDocuments ?? []) {
      if (isDeletedContextTitle(doc.title)) hidden.add(doc.id);
    }

    if (isDeletedContextTitle(session.contextLabel) && session.contextId) {
      hidden.add(session.contextId);
    }

    return hidden;
  }, [session, contextStatuses]);

  useEffect(() => {
    if (isNewChat || !sessionId || isLoading) return;

    const contextUnavailable =
      isError ||
      (session &&
        ((session.contextType === "document" &&
          isDeletedContextTitle(session.contextLabel)) ||
          (session.contextType === "folder" &&
            isDeletedContextTitle(session.contextLabel)) ||
          (session.contextType === "documents" &&
            (session.contextDocuments ?? []).length > 0 &&
            (session.contextDocuments ?? []).every((doc) =>
              isDeletedContextTitle(doc.title),
            ))));

    if (contextUnavailable) {
      qc.removeQueries({ queryKey: chatKeys.session(sessionId) });
      void qc.invalidateQueries({ queryKey: chatKeys.sessions });
      router.replace("/chat");
    }
  }, [isNewChat, sessionId, isLoading, isError, session, qc, router]);

  const visibleMessages = useMemo(() => {
    if (!session || hiddenDocumentIds.size === 0) return session?.messages ?? [];
    return session.messages.map((message) => ({
      ...message,
      citations: filterVisibleCitations(message.citations, hiddenDocumentIds),
    }));
  }, [session, hiddenDocumentIds]);

  const handleSelectCitation = useCallback(
    (message: ChatMessage, citation: ChatCitation) => {
      setActiveMessage(message);
      setSelectedCitation(citation);
      setMobileTab("citations");
    },
    [],
  );

  const handleSelectMessage = useCallback((message: ChatMessage) => {
    setActiveMessage(message);
    if (message.citations.length > 0) {
      setSelectedCitation(message.citations[0] ?? null);
    }
    setMobileTab("citations");
  }, []);

  const handleStreamSuccess = useCallback(
    (data: { assistantMessage: ChatMessage }) => {
      setActiveMessage(data.assistantMessage);
      if (data.assistantMessage.citations.length > 0) {
        const first = data.assistantMessage.citations[0]!;
        setSelectedCitation(first);
        setMobileTab("citations");
      }
    },
    [],
  );

  const handleStreamError = useCallback((err: unknown) => {
    if (isAbortError(err)) return;
    setSendError(getUserErrorMessage(err));
  }, []);

  const handleSend = useCallback(
    (input: SendMessageInput) => {
      if (!sessionId || isGenerating) return;
      setSendError(null);
      sendMessage.mutate(input, {
        onSuccess: handleStreamSuccess,
        onError: handleStreamError,
      });
    },
    [sessionId, isGenerating, sendMessage, handleStreamSuccess, handleStreamError],
  );

  const handleRegenerate = useCallback(() => {
    if (!sessionId || isGenerating) return;
    setSendError(null);
    regenerateMessage.mutate(undefined, {
      onSuccess: handleStreamSuccess,
      onError: handleStreamError,
    });
  }, [sessionId, isGenerating, regenerateMessage, handleStreamSuccess, handleStreamError]);

  const handleEditMessage = useCallback(
    (messageId: string, content: string) => {
      if (!sessionId || isGenerating) return;
      setSendError(null);
      editMessage.mutate(
        { messageId, content },
        {
          onSuccess: handleStreamSuccess,
          onError: handleStreamError,
        },
      );
    },
    [sessionId, isGenerating, editMessage, handleStreamSuccess, handleStreamError],
  );

  const handleStop = useCallback(() => {
    sendMessage.stop();
    regenerateMessage.stop();
    editMessage.stop();
  }, [sendMessage, regenerateMessage, editMessage]);

  const streamingMessageId =
    isGenerating && session
      ? (session.messages.findLast((m) => m.id.startsWith("streaming-"))?.id ?? null)
      : null;

  const showThinking = isGenerating && !streamingMessageId;

  const tabClass = (tab: MobileTab) =>
    cn(
      "flex-1 rounded-lg border-2 px-3 py-2 text-xs font-bold transition-all lg:hidden",
      mobileTab === tab
        ? "border-brutal-ink bg-brutal-primary text-white shadow-brutal-sm"
        : "border-transparent bg-brutal-bg text-brutal-ink",
    );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <ChatSourcePickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSessionCreated={onSessionCreated}
      />

      <Topbar breadcrumbs={[{ label: "Trò chuyện AI" }]} />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex shrink-0 gap-1 border-b-2 border-brutal-ink bg-brutal-surface p-2 lg:hidden">
          <button
            type="button"
            className={tabClass("sources")}
            onClick={() => setMobileTab("sources")}
          >
            Nguồn
          </button>
          <button
            type="button"
            className={tabClass("chat")}
            onClick={() => setMobileTab("chat")}
          >
            Chat
          </button>
          <button
            type="button"
            className={tabClass("citations")}
            onClick={() => setMobileTab("citations")}
          >
            Trích dẫn
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden p-2 sm:p-3 lg:flex-row lg:gap-3">
          {/* Left — sources & sessions */}
          <aside
            className={cn(
              "brutal-card flex min-h-0 w-full shrink-0 flex-col gap-4 overflow-y-auto p-4 lg:w-64 lg:max-w-xs",
              mobileTab !== "sources" && "hidden lg:flex",
            )}
          >
            <ChatSessionList
              activeSessionId={sessionId}
              onOpenPicker={() => setPickerOpen(true)}
            />

            {session ? (
              <>
                <ChatContextBadge session={session} messages={session.messages} />
                <p className="text-xs text-brutal-muted">
                  Phạm vi nguồn cố định khi tạo phiên. Nhấn thẻ nguồn để xem
                  tài liệu đã chọn.
                </p>
              </>
            ) : null}
          </aside>

          {/* Center — chat */}
          <section
            className={cn(
              "brutal-card flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl",
              mobileTab !== "chat" && "hidden lg:flex",
            )}
          >
            {isNewChat ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
                <div className="space-y-2">
                  <p className="font-heading text-lg font-extrabold">
                    Hỏi ngay với toàn bộ tài liệu
                  </p>
                  <p className="text-sm text-brutal-muted">
                    Bắt đầu nhanh với mọi tài liệu bạn có quyền đọc — hoặc chọn nguồn cụ thể.
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <BrutalButton
                    variant="primary"
                    className="!w-auto"
                    loading={createSession.isPending}
                    onClick={() => {
                      void createSession
                        .mutateAsync({ contextType: "all" })
                        .then((s) => onSessionCreated(s.id));
                    }}
                  >
                    Hỏi ngay
                  </BrutalButton>
                  <BrutalButton
                    variant="ghost"
                    className="!w-auto"
                    onClick={() => setPickerOpen(true)}
                  >
                    Chọn nguồn cụ thể
                  </BrutalButton>
                </div>
              </div>
            ) : isLoading ? (
              <div className="flex flex-1 items-center justify-center p-8">
                <LoadingScreen message="Đang tải cuộc trò chuyện…" />
              </div>
            ) : isError || !session ? (
              <div className="p-4">
                <ErrorAlert message="Không tải được cuộc trò chuyện. Vui lòng thử lại." />
              </div>
            ) : (
              <>
                <div className="flex shrink-0 items-center gap-2 border-b-2 border-brutal-ink px-4 py-2">
                  <h1 className="min-w-0 flex-1 truncate font-heading text-lg font-extrabold">
                    {session.title}
                  </h1>
                  <ChatSessionPinButton
                    sessionId={session.id}
                    isPinned={session.isPinned}
                    title={session.title}
                    className="!h-8 !w-8"
                    iconClassName="!h-4 !w-4"
                  />
                </div>
                {isContextProcessing && (
                  <div className="shrink-0 border-b-2 border-brutal-ink bg-brutal-accent/10 px-4 py-2 text-xs font-semibold text-brutal-ink">
                    Tài liệu đang được xử lý — câu trả lời có thể chưa đầy đủ cho đến khi xử lý xong.
                  </div>
                )}
                <ChatMessageList
                  messages={visibleMessages}
                  isThinking={showThinking}
                  streamingMessageId={streamingMessageId}
                  activeMessageId={activeMessage?.id}
                  onSelectCitation={handleSelectCitation}
                  onSelectMessage={handleSelectMessage}
                  onSuggestionClick={(question) =>
                    handleSend({ content: question, mode: "chat" })
                  }
                  onRegenerate={handleRegenerate}
                  onEditMessage={handleEditMessage}
                  isSending={isGenerating}
                />
                {sendError && (
                  <div className="shrink-0 px-4 pb-2">
                    <ErrorAlert message={sendError} variant="inline" />
                  </div>
                )}
                <ChatComposer
                  onSend={handleSend}
                  onStop={handleStop}
                  isPending={isGenerating}
                />
              </>
            )}
          </section>

          {/* Right — citations */}
          <aside
            className={cn(
              "brutal-card flex min-h-0 w-full shrink-0 flex-col overflow-y-auto p-4 lg:w-80",
              mobileTab !== "citations" && "hidden lg:flex",
            )}
          >
            <CitationPanel
              message={activeMessage}
              selectedCitation={selectedCitation}
              onSelectCitation={(c) => {
                setSelectedCitation(c);
              }}
            />
          </aside>
        </div>
      </div>
    </div>
  );
}
