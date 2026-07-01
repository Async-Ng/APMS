"use client";

import { ExternalLink, FileText } from "lucide-react";
import Link from "next/link";

import { BrutalButton } from "@/components/ui/BrutalButton";
import type { ChatCitation } from "@/lib/queries/chat";

interface CitationDetailProps {
  citation: ChatCitation | null;
}

export function CitationDetail({ citation }: CitationDetailProps) {
  if (!citation) {
    return (
      <p className="text-sm text-brutal-muted">
        Chọn một trích dẫn để xem chi tiết.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-2">
        <FileText className="h-5 w-5 shrink-0 text-brutal-secondary" />
        <div className="min-w-0">
          <p className="font-heading font-extrabold leading-tight text-brutal-ink">
            {citation.documentTitle}
          </p>
          {(citation.heading || citation.pageNumber != null) && (
            <p className="mt-1 text-xs font-semibold text-brutal-muted">
              {[
                citation.heading,
                citation.pageNumber != null ? `Trang ${citation.pageNumber}` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
          {citation.sectionPath && citation.sectionPath.length > 0 && (
            <p className="mt-1 text-xs text-brutal-muted">
              {citation.sectionPath.join(" › ")}
            </p>
          )}
        </div>
      </div>

      <blockquote className="rounded-xl border-2 border-brutal-ink bg-brutal-bg p-3 text-sm leading-relaxed text-brutal-ink">
        {citation.excerpt}
      </blockquote>

      <Link href={`/documents/${citation.documentId}`}>
        <BrutalButton variant="primary" className="w-full">
          <ExternalLink className="h-4 w-4" />
          Mở tài liệu
        </BrutalButton>
      </Link>
    </div>
  );
}
