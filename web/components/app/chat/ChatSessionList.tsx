"use client";

import { MessageSquare, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { BrutalButton } from "@/components/ui/BrutalButton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/cn";
import type { ChatSession } from "@/lib/queries/chat";
import { useChatSessions, useDeleteSession } from "@/lib/queries/chat";

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "Vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return d.toLocaleDateString("vi-VN");
}

interface ChatSessionListProps {
  activeSessionId?: string;
  onNewChat: () => void;
}

export function ChatSessionList({
  activeSessionId,
  onNewChat,
}: ChatSessionListProps) {
  const router = useRouter();
  const { data: sessions, isLoading } = useChatSessions();
  const { mutate: deleteSession, isPending: isDeleting } = useDeleteSession();
  const [sessionToDelete, setSessionToDelete] = useState<ChatSession | null>(
    null,
  );

  function handleDeleteClick(e: React.MouseEvent, session: ChatSession) {
    e.preventDefault();
    e.stopPropagation();
    setSessionToDelete(session);
  }

  function confirmDelete() {
    if (!sessionToDelete) return;
    const { id } = sessionToDelete;
    deleteSession(id, {
      onSuccess: () => {
        setSessionToDelete(null);
        if (activeSessionId === id) {
          router.push("/chat");
        }
      },
    });
  }

  return (
    <>
      <ConfirmDialog
        open={sessionToDelete !== null}
        title="Xóa cuộc trò chuyện?"
        description={
          <>
            Bạn sắp xóa{" "}
            <span className="font-bold text-brutal-ink">
              &ldquo;{sessionToDelete?.title}&rdquo;
            </span>
            . Hành động này không thể hoàn tác.
          </>
        }
        confirmLabel="Xóa"
        cancelLabel="Huỷ"
        tone="danger"
        isPending={isDeleting}
        onClose={() => {
          if (!isDeleting) setSessionToDelete(null);
        }}
        onConfirm={confirmDelete}
      />

    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-heading text-xs font-bold uppercase tracking-widest text-brutal-muted">
          Cuộc trò chuyện
        </h2>
        <BrutalButton
          variant="ghost"
          className="!h-8 !px-2 !py-1"
          onClick={onNewChat}
          aria-label="Cuộc trò chuyện mới"
        >
          <Plus className="h-4 w-4" />
        </BrutalButton>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : sessions?.length === 0 ? (
        <p className="text-xs text-brutal-muted">Chưa có cuộc trò chuyện.</p>
      ) : (
        <ul className="max-h-48 space-y-1 overflow-y-auto">
          {sessions?.map((session) => (
            <li key={session.id}>
              <Link
                href={`/chat/${session.id}`}
                className={cn(
                  "group flex items-start gap-2 rounded-xl border-2 px-3 py-2 transition-all",
                  activeSessionId === session.id
                    ? "border-brutal-ink bg-brutal-primary/15 shadow-brutal-sm"
                    : "border-transparent hover:border-brutal-ink hover:bg-brutal-bg",
                )}
              >
                <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-brutal-muted" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-brutal-ink">
                    {session.title}
                  </p>
                  <p className="text-xs text-brutal-muted">
                    {formatRelative(session.updatedAt)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => handleDeleteClick(e, session)}
                  disabled={isDeleting}
                  className="focus-brutal shrink-0 rounded-lg p-1 opacity-0 transition-opacity hover:bg-red-50 group-hover:opacity-100"
                  aria-label={`Xóa ${session.title}`}
                >
                  <Trash2 className="h-3.5 w-3.5 text-brutal-danger" />
                </button>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
    </>
  );
}
