"use client";

import { MessageSquare, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { BrutalButton } from "@/components/ui/BrutalButton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { cn } from "@/lib/cn";
import type { ChatSession } from "@/lib/queries/chat";
import {
  getApiErrorMessage,
  useChatSessions,
  useDeleteSession,
  useUpdateSession,
} from "@/lib/queries/chat";

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

interface SessionListItemProps {
  session: ChatSession;
  activeSessionId?: string;
  isDeleting: boolean;
  onDeleteClick: (e: React.MouseEvent, session: ChatSession) => void;
}

function SessionListItem({
  session,
  activeSessionId,
  isDeleting,
  onDeleteClick,
}: SessionListItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(session.title);
  const [editError, setEditError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const updateSession = useUpdateSession(session.id);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  useEffect(() => {
    if (!isEditing) setEditTitle(session.title);
  }, [session.title, isEditing]);

  function handleRenameClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setEditError(null);
    setEditTitle(session.title);
    setIsEditing(true);
  }

  function cancelEdit() {
    setIsEditing(false);
    setEditTitle(session.title);
    setEditError(null);
  }

  function saveEdit() {
    const trimmed = editTitle.trim();
    if (!trimmed) {
      setEditError("Tên không được để trống.");
      return;
    }
    if (trimmed === session.title) {
      cancelEdit();
      return;
    }

    updateSession.mutate(trimmed, {
      onSuccess: () => {
        setIsEditing(false);
        setEditError(null);
      },
      onError: (err) => {
        setEditError(getApiErrorMessage(err));
      },
    });
  }

  if (isEditing) {
    return (
      <li>
        <div
          className={cn(
            "rounded-xl border-2 px-3 py-2",
            activeSessionId === session.id
              ? "border-brutal-ink bg-brutal-primary/15 shadow-brutal-sm"
              : "border-brutal-ink bg-brutal-bg",
          )}
        >
          <input
            ref={inputRef}
            type="text"
            value={editTitle}
            onChange={(e) => {
              setEditTitle(e.target.value);
              setEditError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                saveEdit();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                cancelEdit();
              }
            }}
            maxLength={255}
            disabled={updateSession.isPending}
            className="focus-brutal w-full rounded-lg border-2 border-brutal-ink bg-brutal-surface px-2 py-1 text-sm font-bold text-brutal-ink outline-none"
            aria-label="Đổi tên cuộc trò chuyện"
          />
          {editError && (
            <div className="mt-1">
              <ErrorAlert message={editError} variant="inline" />
            </div>
          )}
          <div className="mt-2 flex gap-1">
            <button
              type="button"
              onClick={cancelEdit}
              disabled={updateSession.isPending}
              className="focus-brutal flex-1 rounded-lg border-2 border-brutal-ink px-2 py-1 text-xs font-semibold hover:bg-brutal-surface disabled:opacity-50"
            >
              Huỷ
            </button>
            <button
              type="button"
              onClick={saveEdit}
              disabled={updateSession.isPending || !editTitle.trim()}
              className="focus-brutal flex-1 rounded-lg border-2 border-brutal-ink bg-brutal-primary px-2 py-1 text-xs font-semibold text-white disabled:opacity-50"
            >
              {updateSession.isPending ? "Đang lưu…" : "Lưu"}
            </button>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li>
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
        <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={handleRenameClick}
            disabled={isDeleting}
            className="focus-brutal rounded-lg p-1 hover:bg-brutal-bg"
            aria-label={`Đổi tên ${session.title}`}
          >
            <Pencil className="h-3.5 w-3.5 text-brutal-muted" />
          </button>
          <button
            type="button"
            onClick={(e) => onDeleteClick(e, session)}
            disabled={isDeleting}
            className="focus-brutal rounded-lg p-1 hover:bg-red-50"
            aria-label={`Xóa ${session.title}`}
          >
            <Trash2 className="h-3.5 w-3.5 text-brutal-danger" />
          </button>
        </div>
      </Link>
    </li>
  );
}

interface ChatSessionListProps {
  activeSessionId?: string;
  onOpenPicker: () => void;
}

export function ChatSessionList({
  activeSessionId,
  onOpenPicker,
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
          onClick={onOpenPicker}
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
              <SessionListItem
                key={session.id}
                session={session}
                activeSessionId={activeSessionId}
                isDeleting={isDeleting}
                onDeleteClick={handleDeleteClick}
              />
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
