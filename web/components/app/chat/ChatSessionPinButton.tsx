"use client";

import { Pin } from "lucide-react";

import { cn } from "@/lib/cn";
import { useUpdateSession } from "@/lib/queries/chat";

interface ChatSessionPinButtonProps {
  sessionId: string;
  isPinned: boolean;
  title: string;
  className?: string;
  iconClassName?: string;
}

export function ChatSessionPinButton({
  sessionId,
  isPinned,
  title,
  className,
  iconClassName,
}: ChatSessionPinButtonProps) {
  const updateSession = useUpdateSession(sessionId);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        updateSession.mutate({ isPinned: !isPinned });
      }}
      disabled={updateSession.isPending}
      className={cn(
        "focus-brutal flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 border-transparent transition-all hover:border-brutal-ink hover:bg-brutal-bg hover:shadow-brutal-sm disabled:opacity-50",
        className,
      )}
      aria-label={isPinned ? `Bỏ ghim ${title}` : `Ghim ${title}`}
      aria-pressed={isPinned}
    >
      <Pin
        className={cn(
          "h-3.5 w-3.5 text-brutal-muted",
          isPinned && "fill-brutal-primary text-brutal-primary",
          iconClassName,
        )}
      />
    </button>
  );
}
