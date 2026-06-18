"use client";

import { cn } from "@/lib/cn";
import type { ChatCitation, ChatMessage } from "@/lib/queries/chat";

import { CitationDetail } from "./CitationDetail";

interface CitationPanelProps {
  message: ChatMessage | null;
  selectedCitation: ChatCitation | null;
  onSelectCitation: (citation: ChatCitation) => void;
}

function citationKey(c: ChatCitation): string {
  return `${c.documentId}-${c.pageNumber ?? "n"}-${c.excerpt.slice(0, 32)}`;
}

export function CitationPanel({
  message,
  selectedCitation,
  onSelectCitation,
}: CitationPanelProps) {
  const citations = message?.role === "assistant" ? message.citations : [];

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <h2 className="shrink-0 font-heading text-xs font-bold uppercase tracking-widest text-brutal-muted">
        Trích dẫn
      </h2>

      {citations.length === 0 ? (
        <p className="text-sm text-brutal-muted">
          Chưa có trích dẫn. Gửi câu hỏi để AI trả lời kèm nguồn tài liệu.
        </p>
      ) : (
        <>
          <ul className="max-h-40 shrink-0 space-y-1 overflow-y-auto">
            {citations.map((citation, idx) => {
              const key = citationKey(citation);
              const isActive =
                selectedCitation && citationKey(selectedCitation) === key;

              return (
                <li key={key}>
                  <button
                    type="button"
                    onClick={() => onSelectCitation(citation)}
                    className={cn(
                      "focus-brutal w-full rounded-lg border-2 px-3 py-2 text-left text-sm transition-all",
                      isActive
                        ? "border-brutal-ink bg-brutal-primary/15 shadow-brutal-sm"
                        : "border-transparent hover:border-brutal-ink hover:bg-brutal-bg",
                    )}
                  >
                    <span className="font-bold text-brutal-ink">
                      [{citation.sourceIndex ?? idx + 1}] {citation.documentTitle}
                    </span>
                    {citation.pageNumber != null && (
                      <span className="ml-1 text-xs text-brutal-muted">
                        · Trang {citation.pageNumber}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="min-h-0 flex-1 overflow-y-auto border-t-2 border-brutal-ink/20 pt-4">
            <CitationDetail citation={selectedCitation} />
          </div>
        </>
      )}
    </div>
  );
}
