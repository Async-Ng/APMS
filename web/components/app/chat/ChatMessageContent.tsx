import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/cn";
import type { ChatCitation } from "@/lib/queries/chat";

const CITATION_REF_RE = /\[(\d+)\]/g;

function splitCitationSegments(content: string): Array<{ type: "text"; value: string } | { type: "ref"; index: number }> {
  const segments: Array<{ type: "text"; value: string } | { type: "ref"; index: number }> = [];
  let lastIndex = 0;

  for (const match of content.matchAll(CITATION_REF_RE)) {
    const start = match.index ?? 0;
    if (start > lastIndex) {
      segments.push({ type: "text", value: content.slice(lastIndex, start) });
    }
    const index = Number.parseInt(match[1] ?? "", 10);
    if (Number.isFinite(index)) {
      segments.push({ type: "ref", index });
    }
    lastIndex = start + match[0].length;
  }

  if (lastIndex < content.length) {
    segments.push({ type: "text", value: content.slice(lastIndex) });
  }

  return segments;
}

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
  const citationBySource = new Map(
    citations.map((c) => [c.sourceIndex ?? 0, c]),
  );

  const segments = splitCitationSegments(content);

  if (segments.length === 0) {
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
      {segments.map((segment, idx) => {
        if (segment.type === "text") {
          if (!segment.value) return null;
          return (
            <ReactMarkdown
              key={`text-${idx}`}
              remarkPlugins={[remarkGfm]}
              components={markdownComponents}
            >
              {segment.value}
            </ReactMarkdown>
          );
        }

        const citation = citationBySource.get(segment.index);
        const label = `[${segment.index}]`;

        if (!citation || !onCitationClick) {
          return (
            <span key={`ref-${idx}`} className="font-bold text-brutal-secondary">
              {label}
            </span>
          );
        }

        return (
          <button
            key={`ref-${idx}`}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCitationClick(citation);
            }}
            className={cn(
              "focus-brutal mx-0.5 inline-flex items-center rounded border border-brutal-ink px-1 py-0 text-xs font-bold",
              "bg-brutal-accent/40 text-brutal-ink hover:bg-brutal-primary hover:text-white",
            )}
            title={citation.documentTitle}
          >
            {label}
          </button>
        );
      })}
      {isStreaming && (
        <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-brutal-primary align-text-bottom" />
      )}
    </div>
  );
}
