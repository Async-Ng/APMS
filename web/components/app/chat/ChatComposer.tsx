"use client";

import { Send } from "lucide-react";
import { useState } from "react";

import { BrutalButton } from "@/components/ui/BrutalButton";
import { useChatDailyUsage } from "@/lib/chat-daily-usage";
import { cn } from "@/lib/cn";
import {
  CHAT_PRESET_CONTENT,
  CHAT_PRESET_LABELS,
  type ChatMode,
  type SendMessageInput,
} from "@/lib/queries/chat";

interface ChatComposerProps {
  onSend: (input: SendMessageInput) => void;
  disabled?: boolean;
  isPending?: boolean;
}

const PRESET_MODES = ["summary", "faq", "study_guide"] as const satisfies ReadonlyArray<
  Exclude<ChatMode, "chat">
>;

export function ChatComposer({
  onSend,
  disabled = false,
  isPending = false,
}: ChatComposerProps) {
  const [content, setContent] = useState("");
  const { limit, remaining, isNearLimit } = useChatDailyUsage();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || disabled || isPending) return;
    onSend({ content: trimmed, mode: "chat" });
    setContent("");
  }

  function handlePreset(mode: Exclude<ChatMode, "chat">) {
    if (disabled || isPending) return;
    onSend({ content: CHAT_PRESET_CONTENT[mode], mode });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="shrink-0 border-t-2 border-brutal-ink bg-brutal-surface p-3 sm:p-4"
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
        {PRESET_MODES.map((mode) => (
          <button
            key={mode}
            type="button"
            disabled={disabled || isPending}
            onClick={() => handlePreset(mode)}
            className={cn(
              "focus-brutal rounded-full border-2 border-brutal-ink px-2.5 py-0.5 text-xs font-bold transition-colors",
              "bg-brutal-bg text-brutal-ink hover:bg-brutal-accent/40 disabled:opacity-50",
            )}
          >
            {CHAT_PRESET_LABELS[mode]}
          </button>
        ))}
        </div>
        <span
          className={cn(
            "text-xs font-semibold tabular-nums",
            isNearLimit ? "text-brutal-danger" : "text-brutal-muted",
          )}
          title="Giới hạn hỏi đáp AI mỗi ngày"
        >
          Còn {remaining}/{limit} lượt hôm nay
        </span>
      </div>

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
