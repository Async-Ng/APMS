"use client";

import { FileText, Presentation } from "lucide-react";
import { useState } from "react";

import { BrutalButton } from "@/components/ui/BrutalButton";
import { CITATION_BLOCK_CLASS } from "@/lib/citation-highlight";
import { cn } from "@/lib/cn";
import type { CitationContext } from "@/lib/queries/documents";

import { CustomOfficeViewer } from "./CustomOfficeViewer";

interface CustomPptxTextViewerProps {
  citationContext: CitationContext;
  originalUrl: string;
}

export function CustomPptxTextViewer({
  citationContext,
  originalUrl,
}: CustomPptxTextViewerProps) {
  const [showOriginalPreview, setShowOriginalPreview] = useState(false);
  const slideNumber = citationContext.pageNumber ?? citationContext.locator.pageNumber;
  const pageChunks =
    citationContext.pageChunks.length > 0
      ? citationContext.pageChunks
      : [
          {
            chunkIndex: citationContext.chunkIndex,
            content: citationContext.content,
            heading: citationContext.heading,
            sectionPath: citationContext.sectionPath,
            pageNumber: citationContext.pageNumber,
            blockType: citationContext.blockType,
          },
        ];

  if (showOriginalPreview) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex justify-end">
          <BrutalButton
            variant="ghost"
            onClick={() => setShowOriginalPreview(false)}
          >
            <FileText className="h-4 w-4" />
            Quay lại nguồn trích dẫn
          </BrutalButton>
        </div>
        <CustomOfficeViewer url={originalUrl} title="Xem trước PowerPoint" />
      </div>
    );
  }

  return (
    <div
      className="flex flex-1 flex-col overflow-hidden rounded-xl border-2 border-brutal-ink bg-brutal-surface shadow-brutal-sm"
      style={{ minHeight: "70vh" }}
    >
      <div className="flex flex-col gap-2 border-b-2 border-brutal-ink bg-brutal-bg px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-heading text-sm font-bold text-brutal-ink">
            <Presentation className="h-4 w-4 shrink-0" />
            {slideNumber != null ? `Slide ${slideNumber}` : "Slide được trích dẫn"}
          </p>
          <p className="mt-1 text-xs text-brutal-muted">
            Đang hiển thị nội dung slide đã được trích dẫn từ kết quả xử lý tài liệu.
          </p>
        </div>
        <BrutalButton
          variant="ghost"
          className="shrink-0"
          onClick={() => setShowOriginalPreview(true)}
        >
          <Presentation className="h-4 w-4" />
          Xem preview gốc
        </BrutalButton>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-[#E5E5E5] p-4">
        <div className="mx-auto flex max-w-4xl flex-col gap-3 rounded-xl border-2 border-brutal-ink bg-white p-5 shadow-brutal-sm">
          {pageChunks.map((chunk) => {
            const isCitationChunk = chunk.chunkIndex === citationContext.chunkIndex;

            return (
              <section
                key={chunk.chunkIndex}
                className={cn(
                  "rounded-lg border border-brutal-ink/20 bg-brutal-bg/40 p-3 text-sm leading-relaxed text-brutal-ink",
                  isCitationChunk && CITATION_BLOCK_CLASS,
                )}
              >
                {(chunk.heading || chunk.sectionPath.length > 0) && (
                  <div className="mb-2 text-xs font-bold text-brutal-muted">
                    {[chunk.heading, chunk.sectionPath.join(" › ")]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                )}
                <pre className="whitespace-pre-wrap font-sans">{chunk.content}</pre>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
