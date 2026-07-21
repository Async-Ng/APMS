"use client";

import { useEffect, useRef, useState } from "react";
import { renderAsync } from "docx-preview";

import { ErrorAlert } from "@/components/ui/ErrorAlert";
import {
  CITATION_BLOCK_CLASS,
  citationNeedle,
  findBestElement,
  highlightFirstTextMatch,
} from "@/lib/citation-highlight";
import type { CitationContext } from "@/lib/queries/documents";

interface CustomDocxViewerProps {
  url: string;
  citationContext?: CitationContext | null;
}

export function CustomDocxViewer({ url, citationContext }: CustomDocxViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    container.innerHTML = "";

    async function load() {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const blob = await response.blob();
        if (cancelled || !containerRef.current) return;

        await renderAsync(blob, containerRef.current, undefined, {
          className: "docx-preview",
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          breakPages: true,
        });
      } catch {
        if (!cancelled) {
          setError("Không thể tải tài liệu Word.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [url]);

  useEffect(() => {
    if (loading || error) return;

    const container = containerRef.current;
    const needle = citationNeedle(citationContext);
    if (!container || !needle) return;

    const candidates = Array.from(
      container.querySelectorAll<HTMLElement>("p, table, li, h1, h2, h3, h4, div"),
    ).filter((element) => (element.textContent ?? "").trim().length > 0);

    const bestElement = findBestElement(candidates, needle);
    if (!bestElement) return;

    const highlighted = highlightFirstTextMatch(bestElement, needle);
    if (!highlighted) {
      bestElement.classList.add(...CITATION_BLOCK_CLASS.split(" "));
    }
    bestElement.scrollIntoView({ block: "center", inline: "nearest" });
  }, [citationContext, error, loading]);

  return (
    <div
      className="flex flex-1 flex-col overflow-hidden rounded-xl border-2 border-brutal-ink bg-brutal-surface shadow-brutal-sm"
      style={{ minHeight: "70vh" }}
    >
      <div className="border-b-2 border-brutal-ink bg-brutal-bg px-4 py-2">
        <p className="font-heading text-sm font-bold text-brutal-ink">
          Word preview
        </p>
      </div>

      <div className="relative flex-1 overflow-auto bg-[#E5E5E5] p-4">
        {loading && (
          <div className="flex items-center justify-center p-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-brutal-ink border-t-brutal-primary" />
          </div>
        )}
        {error && (
          <div className="p-4">
            <ErrorAlert message={error} />
          </div>
        )}
        <div
          ref={containerRef}
          className="docx-viewer-root mx-auto max-w-4xl bg-white shadow-brutal-sm"
          style={{ display: loading || error ? "none" : "block" }}
        />
      </div>
    </div>
  );
}
