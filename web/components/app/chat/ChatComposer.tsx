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
      className="shrink-0 border-t-2 border-brutal-ink bg-brutal-surface p-3"
    >
      <div className="flex gap-2">
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
          className="focus-brutal min-h-[52px] flex-1 resize-none rounded-xl border-2 border-brutal-ink bg-brutal-bg px-3 py-2 text-sm font-medium shadow-brutal-sm outline-none disabled:opacity-50"
        />
        <BrutalButton
          type="submit"
          variant="primary"
          disabled={!content.trim() || disabled || isPending}
          loading={isPending}
          className="!h-auto self-end"
          aria-label="Gửi tin nhắn"
        >
          <Send className="h-4 w-4" />
        </BrutalButton>
      </div>
    </form>
  );
}
