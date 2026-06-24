"use client";

import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

import { BrutalButton } from "@/components/ui/BrutalButton";
import { cn } from "@/lib/cn";

// Set up the PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface CustomPdfViewerProps {
  url: string;
}

type PanStart = {
  x: number;
  y: number;
  scrollLeft: number;
  scrollTop: number;
};

export function CustomPdfViewer({ url }: CustomPdfViewerProps) {
  const [numPages, setNumPages] = useState<number>();
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [isPanning, setIsPanning] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const panStartRef = useRef<PanStart | null>(null);

  const panEnabled = scale > 1;

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setPageNumber(1);
  }

  function changePage(offset: number) {
    setPageNumber((prev) =>
      Math.min(Math.max(1, prev + offset), numPages ?? 1),
    );
  }

  function changeScale(offset: number) {
    setScale((prev) => Math.min(Math.max(0.5, prev + offset), 3.0));
  }

  const stopPanning = useCallback(() => {
    panStartRef.current = null;
    setIsPanning(false);
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!panEnabled || e.button !== 0) return;

      const el = scrollRef.current;
      if (!el) return;

      panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        scrollLeft: el.scrollLeft,
        scrollTop: el.scrollTop,
      };
      setIsPanning(true);
      e.preventDefault();
    },
    [panEnabled],
  );

  useEffect(() => {
    if (!isPanning) return;

    function handleMouseMove(e: MouseEvent) {
      const start = panStartRef.current;
      const el = scrollRef.current;
      if (!start || !el) return;

      el.scrollLeft = start.scrollLeft - (e.clientX - start.x);
      el.scrollTop = start.scrollTop - (e.clientY - start.y);
    }

    function handleMouseUp() {
      stopPanning();
    }

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isPanning, stopPanning]);

  return (
    <div className="flex h-[70vh] min-w-0 w-full max-w-full flex-col overflow-hidden rounded-xl border-2 border-brutal-ink bg-brutal-surface shadow-brutal-sm">
      {/* Neo-brutalist Toolbar */}
      <div className="flex shrink-0 flex-col border-b-2 border-brutal-ink bg-brutal-bg">
        <div className="flex items-center justify-between gap-2 px-4 py-2">
          {/* Pagination controls */}
          <div className="flex shrink-0 items-center gap-3">
            <BrutalButton
              variant="ghost"
              className="!w-auto shrink-0 !px-2 !py-1 h-8"
              onClick={() => changePage(-1)}
              disabled={pageNumber <= 1}
              aria-label="Trang trước"
            >
              <ChevronLeft className="h-4 w-4" />
            </BrutalButton>
            <span className="font-heading text-sm font-bold text-brutal-ink min-w-[70px] text-center">
              {pageNumber} / {numPages ?? "--"}
            </span>
            <BrutalButton
              variant="ghost"
              className="!w-auto shrink-0 !px-2 !py-1 h-8"
              onClick={() => changePage(1)}
              disabled={!numPages || pageNumber >= numPages}
              aria-label="Trang sau"
            >
              <ChevronRight className="h-4 w-4" />
            </BrutalButton>
          </div>

          {/* Zoom controls */}
          <div className="flex shrink-0 items-center gap-2">
            <BrutalButton
              variant="ghost"
              className="!w-auto shrink-0 !px-2 !py-1 h-8"
              onClick={() => changeScale(-0.2)}
              disabled={scale <= 0.5}
              aria-label="Thu nhỏ"
            >
              <ZoomOut className="h-4 w-4" />
            </BrutalButton>
            <span className="font-heading text-sm font-bold text-brutal-ink min-w-[60px] text-center">
              {Math.round(scale * 100)}%
            </span>
            <BrutalButton
              variant="ghost"
              className="!w-auto shrink-0 !px-2 !py-1 h-8"
              onClick={() => changeScale(0.2)}
              disabled={scale >= 3.0}
              aria-label="Phóng to"
            >
              <ZoomIn className="h-4 w-4" />
            </BrutalButton>
          </div>
        </div>

        {panEnabled && (
          <p className="hidden border-t border-brutal-ink/10 px-4 py-1 text-xs text-brutal-muted sm:block">
            Giữ chuột trái để kéo tài liệu
          </p>
        )}
      </div>

      {/* PDF Viewer Area */}
      <div
        ref={scrollRef}
        onMouseDown={handleMouseDown}
        className={cn(
          "relative min-h-0 min-w-0 flex-1 overflow-auto bg-[#E5E5E5]",
          panEnabled && "cursor-grab",
          isPanning && "cursor-grabbing select-none",
          panEnabled && !isPanning && "select-none",
        )}
      >
        <div className="box-border flex min-h-full min-w-full items-center justify-center p-6">
          <div className="inline-block shrink-0">
            <Document
            file={url}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={
              <div className="flex items-center justify-center p-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-brutal-ink border-t-brutal-primary" />
              </div>
            }
            error={
              <div className="p-4 text-center font-bold text-brutal-danger">
                Không thể tải PDF.
              </div>
            }
          >
            <Page
              pageNumber={pageNumber}
              scale={scale}
              renderTextLayer={true}
              renderAnnotationLayer={true}
              className="rounded-sm border-2 border-brutal-ink shadow-brutal-sm overflow-hidden bg-white"
            />
          </Document>
          </div>
        </div>
      </div>
    </div>
  );
}
