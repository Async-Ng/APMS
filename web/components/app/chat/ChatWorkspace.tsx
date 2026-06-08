"use client";

import { useCallback, useEffect, useState } from "react";

import { Topbar } from "@/components/app/Topbar";
import { cn } from "@/lib/cn";
import type { ChatCitation, ChatMessage } from "@/lib/queries/chat";
import {
  getApiErrorMessage,
  useChatSession,
  useSendMessage,
} from "@/lib/queries/chat";

import { ChatComposer } from "./ChatComposer";
import { ChatContextBadge } from "./ChatContextBadge";
import { ChatMessageList } from "./ChatMessageList";
import { ChatSessionList } from "./ChatSessionList";
import { ChatSourcePickerModal } from "./ChatSourcePickerModal";
import { CitationPanel } from "./CitationPanel";

type MobileTab = "sources" | "chat" | "citations";

function citationKey(c: ChatCitation): string {
  return `${c.documentId}-${c.pageNumber ?? "n"}-${c.excerpt.slice(0, 32)}`;
}

interface ChatWorkspaceProps {
  sessionId?: string;
  isNewChat?: boolean;
  autoOpenPicker?: boolean;
  onSessionCreated: (id: string) => void;
}

export function ChatWorkspace({
  sessionId,
  isNewChat = false,
  autoOpenPicker = false,
  onSessionCreated,
}: ChatWorkspaceProps) {
  const [mobileTab, setMobileTab] = useState<MobileTab>("chat");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState<ChatCitation | null>(
    null,
  );
  const [selectedCitationKey, setSelectedCitationKey] = useState<string | null>(
    null,
  );
  const [activeMessage, setActiveMessage] = useState<ChatMessage | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  const { data: session, isLoading, isError } = useChatSession(
    isNewChat ? undefined : sessionId,
  );
  const sendMessage = useSendMessage(sessionId ?? "");

  useEffect(() => {
    if (autoOpenPicker && isNewChat) {
      setPickerOpen(true);
    }
  }, [autoOpenPicker, isNewChat]);

  const handleSelectCitation = useCallback(
    (message: ChatMessage, citation: ChatCitation) => {
      setActiveMessage(message);
      setSelectedCitation(citation);
      setSelectedCitationKey(citationKey(citation));
      setMobileTab("citations");
    },
    [],
  );

  const handleSelectMessage = useCallback((message: ChatMessage) => {
    setActiveMessage(message);
    if (message.citations.length > 0) {
      setSelectedCitation(message.citations[0] ?? null);
      setSelectedCitationKey(
        message.citations[0] ? citationKey(message.citations[0]) : null,
      );
    }
    setMobileTab("citations");
  }, []);

  const handleSend = useCallback(
    (content: string) => {
      if (!sessionId) return;
      setSendError(null);
      sendMessage.mutate(content, {
        onSuccess: (data) => {
          setActiveMessage(data.assistantMessage);
          if (data.assistantMessage.citations.length > 0) {
            const first = data.assistantMessage.citations[0]!;
            setSelectedCitation(first);
            setSelectedCitationKey(citationKey(first));
            setMobileTab("citations");
          }
        },
        onError: (err) => {
          setSendError(getApiErrorMessage(err));
        },
      });
    },
    [sessionId, sendMessage],
  );

  const tabClass = (tab: MobileTab) =>
    cn(
      "flex-1 rounded-lg border-2 px-3 py-2 text-xs font-bold transition-all lg:hidden",
      mobileTab === tab
        ? "border-brutal-ink bg-brutal-primary text-white shadow-brutal-sm"
        : "border-transparent bg-brutal-bg text-brutal-ink",
    );

  return (
    <>
      <ChatSourcePickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSessionCreated={onSessionCreated}
      />

      <Topbar breadcrumbs={[{ label: "AI Chat" }]} onMenuOpen={() => {}} />

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex gap-1 border-b-2 border-brutal-ink bg-brutal-surface p-2 lg:hidden">
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

        <div className="flex min-h-0 flex-1 flex-col gap-0 p-2 sm:p-3 lg:flex-row lg:gap-3">
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
                  Phạm vi nguồn cố định khi tạo phiên. Tạo cuộc trò chuyện mới để
                  đổi.
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
              <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
                <p className="font-heading text-lg font-extrabold">
                  Nhấn + để chọn nguồn tài liệu
                </p>
                <p className="text-sm text-brutal-muted">
                  Chọn tài liệu hoặc folder từ My Drive, xem lại rồi bắt đầu trò chuyện.
                </p>
              </div>
            ) : isLoading ? (
              <div className="flex flex-1 items-center justify-center p-8">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-brutal-ink border-t-brutal-primary" />
              </div>
            ) : isError || !session ? (
              <p className="p-4 text-sm font-medium text-brutal-danger">
                Không tải được cuộc trò chuyện.
              </p>
            ) : (
              <>
                <div className="shrink-0 border-b-2 border-brutal-ink px-4 py-2">
                  <h1 className="truncate font-heading text-lg font-extrabold">
                    {session.title}
                  </h1>
                </div>
                <ChatMessageList
                  messages={session.messages}
                  isThinking={sendMessage.isPending}
                  selectedCitationKey={selectedCitationKey}
                  activeMessageId={activeMessage?.id}
                  onSelectCitation={handleSelectCitation}
                  onSelectMessage={handleSelectMessage}
                />
                {sendError && (
                  <p
                    className="shrink-0 px-4 pb-2 text-xs font-medium text-brutal-danger"
                    role="alert"
                  >
                    {sendError}
                  </p>
                )}
                <ChatComposer
                  onSend={handleSend}
                  isPending={sendMessage.isPending}
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
                setSelectedCitationKey(citationKey(c));
              }}
            />
          </aside>
        </div>
      </div>
    </>
  );
}
