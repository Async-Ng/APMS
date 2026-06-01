"use client";

import { Send } from "lucide-react";
import { useState } from "react";

import { BrutalButton } from "@/components/ui/BrutalButton";

interface ChatComposerProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  isPending?: boolean;
}

export function ChatComposer({
  onSend,
  disabled = false,
  isPending = false,
}: ChatComposerProps) {
  const [content, setContent] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || disabled || isPending) return;
    onSend(trimmed);
    setContent("");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="shrink-0 border-t-2 border-brutal-ink bg-brutal-surface p-3 sm:p-4"
    >
      <div className="flex items-end gap-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          placeholder="Đặt câu hỏi về tài liệu…"
          rows={2}
          disabled={disabled || isPending}
          className="focus-brutal min-h-[52px] min-w-0 flex-1 resize-none rounded-xl border-2 border-brutal-ink bg-brutal-bg px-3 py-2.5 text-sm font-medium text-brutal-ink shadow-brutal-sm outline-none placeholder:text-brutal-muted disabled:opacity-50"
        />
        <BrutalButton
          type="submit"
          variant="primary"
          disabled={!content.trim() || disabled || isPending}
          loading={isPending}
          className="!h-[52px] !w-[52px] !min-w-[52px] shrink-0 !p-0"
          aria-label="Gửi tin nhắn"
        >
          {!isPending && <Send className="h-5 w-5 shrink-0" aria-hidden="true" />}
        </BrutalButton>
      </div>
    </form>
  );
}
