import { useMemo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/cn";
import type { ChatCitation } from "@/lib/queries/chat";
import { remarkCitations } from "./remark-citations";

const remarkPlugins = [remarkGfm, remarkCitations];

const markdownComponents: Components = {
  p: ({ children }) => <p className="mb-2 leading-relaxed last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-extrabold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  ul: ({ children }) => <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  code: ({ children }) => (
    <code className="rounded border border-brutal-ink/20 bg-brutal-bg px-1 py-0.5 font-mono text-xs">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="mb-2 overflow-x-auto rounded-lg border-2 border-brutal-ink bg-brutal-bg p-2 font-mono text-xs last:mb-0">
      {children}
    </pre>
  ),
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-brutal-secondary underline"
    >
      {children}
    </a>
  ),
  h1: ({ children }) => (
    <h1 className="mb-1 mt-2 font-heading font-extrabold text-brutal-ink">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-1 mt-2 font-heading font-extrabold text-brutal-ink">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-1 mt-2 font-heading font-extrabold text-brutal-ink">{children}</h3>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-brutal-ink/30 pl-3 italic text-brutal-muted">
      {children}
    </blockquote>
  ),
};

interface ChatMessageContentProps {
  content: string;
  citations?: ChatCitation[];
  onCitationClick?: (citation: ChatCitation) => void;
  isStreaming?: boolean;
}

export function ChatMessageContent({
  content,
  citations = [],
  onCitationClick,
  isStreaming = false,
}: ChatMessageContentProps) {
  const components = useMemo(() => {
    const citationBySource = new Map(
      citations.map((c) => [c.sourceIndex ?? 0, c]),
    );

    const CitationRef = (props: { index?: number | string }) => {
      const refIndex = Number(props.index);
      const citation = citationBySource.get(refIndex) ?? citations[refIndex - 1];
      const label = `[${refIndex}]`;

      if (!citation || !onCitationClick) {
        return <span className="font-bold text-brutal-secondary">{label}</span>;
      }

      return (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onCitationClick(citation);
          }}
          className={cn(
            "focus-brutal mx-0.5 inline-flex cursor-pointer items-center rounded border border-brutal-ink px-1 py-0 text-xs font-bold",
            "bg-brutal-accent/40 text-brutal-ink hover:bg-brutal-primary hover:text-white",
          )}
          title={citation.documentTitle}
        >
          {label}
        </button>
      );
    };

    return {
      ...markdownComponents,
      "citation-ref": CitationRef,
    };
  }, [citations, onCitationClick]);

  if (!content) {
    return (
      <div className="text-sm font-medium leading-relaxed">
        {isStreaming && (
          <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-brutal-primary align-text-bottom" />
        )}
      </div>
    );
  }

  return (
    <div className="text-sm font-medium leading-relaxed">
      <ReactMarkdown remarkPlugins={remarkPlugins} components={components}>
        {content}
      </ReactMarkdown>
      {isStreaming && (
        <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-brutal-primary align-text-bottom" />
      )}
    </div>
  );
}
