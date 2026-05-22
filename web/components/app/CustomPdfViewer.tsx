"use client";

import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

import { BrutalButton } from "@/components/ui/BrutalButton";

// Set up the PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface CustomPdfViewerProps {
  url: string;
}

export function CustomPdfViewer({ url }: CustomPdfViewerProps) {
  const [numPages, setNumPages] = useState<number>();
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);

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

  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-xl border-2 border-brutal-ink shadow-brutal-sm bg-brutal-surface" style={{ minHeight: "70vh" }}>
      {/* Neo-brutalist Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-brutal-ink bg-brutal-bg px-4 py-2">
        {/* Pagination controls */}
        <div className="flex items-center gap-3">
          <BrutalButton
            variant="ghost"
            className="!px-2 !py-1 h-8"
            onClick={() => changePage(-1)}
            disabled={pageNumber <= 1}
            aria-label="Previous Page"
          >
            <ChevronLeft className="h-4 w-4" />
          </BrutalButton>
          <span className="font-heading text-sm font-bold text-brutal-ink min-w-[70px] text-center">
            {pageNumber} / {numPages ?? "--"}
          </span>
          <BrutalButton
            variant="ghost"
            className="!px-2 !py-1 h-8"
            onClick={() => changePage(1)}
            disabled={!numPages || pageNumber >= numPages}
            aria-label="Next Page"
          >
            <ChevronRight className="h-4 w-4" />
          </BrutalButton>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-2">
          <BrutalButton
            variant="ghost"
            className="!px-2 !py-1 h-8"
            onClick={() => changeScale(-0.2)}
            disabled={scale <= 0.5}
            aria-label="Zoom Out"
          >
            <ZoomOut className="h-4 w-4" />
          </BrutalButton>
          <span className="font-heading text-sm font-bold text-brutal-ink min-w-[60px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <BrutalButton
            variant="ghost"
            className="!px-2 !py-1 h-8"
            onClick={() => changeScale(0.2)}
            disabled={scale >= 3.0}
            aria-label="Zoom In"
          >
            <ZoomIn className="h-4 w-4" />
          </BrutalButton>
        </div>
      </div>

      {/* PDF Viewer Area */}
      <div className="relative flex-1 overflow-auto bg-[#E5E5E5] p-6">
        <div className="flex justify-center">
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
  );
}
