"use client";

export function ChatThinkingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="brutal-card max-w-[85%] rounded-2xl rounded-bl-sm border-2 border-brutal-ink bg-brutal-surface px-4 py-3 shadow-brutal-sm">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-brutal-ink border-t-brutal-primary" />
          <p className="text-sm font-medium text-brutal-muted">
            AI đang trả lời…
          </p>
        </div>
      </div>
    </div>
  );
}
