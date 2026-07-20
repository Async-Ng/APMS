import { useCallback, useMemo, useRef, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import { Check, Copy } from "lucide-react";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

import "katex/dist/katex.min.css";
import "highlight.js/styles/github.css";

import { cn } from "@/lib/cn";
import type { ChatCitation } from "@/lib/queries/chat";
import { remarkCitations } from "./remark-citations";

// remarkMath must run before remarkCitations so `[N]` inside formulas stays math.
const remarkPlugins = [remarkGfm, remarkMath, remarkCitations];
const rehypePlugins = [rehypeKatex, rehypeHighlight];

function CodeBlock({ children }: { children?: React.ReactNode }) {
  const preRef = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const text = preRef.current?.innerText ?? "";
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  }, []);

  return (
    <div className="relative mb-2 last:mb-0">
      <button
        type="button"
        onClick={handleCopy}
        className="focus-brutal absolute right-1.5 top-1.5 z-10 inline-flex items-center gap-1 rounded border border-brutal-ink/30 bg-brutal-surface px-1.5 py-0.5 text-[10px] font-semibold text-brutal-muted hover:text-brutal-ink"
        title="Sao chép code"
        aria-label="Sao chép code"
      >
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      </button>
      <pre
        ref={preRef}
        className="overflow-x-auto rounded-lg border-2 border-brutal-ink bg-brutal-bg p-2 pr-10 font-mono text-xs"
      >
        {children}
      </pre>
    </div>
  );
}

const markdownComponents: Components = {
  p: ({ children }) => <p className="mb-2 leading-relaxed last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-extrabold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  ul: ({ children }) => <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  code: ({ children, className }) =>
    className ? (
      // Fenced block code: keep hljs classes so syntax colors apply.
      <code className={cn(className, "font-mono text-xs")}>{children}</code>
    ) : (
      <code className="rounded border border-brutal-ink/20 bg-brutal-bg px-1 py-0.5 font-mono text-xs">
        {children}
      </code>
    ),
  pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
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
  table: ({ children }) => (
    <div className="mb-2 overflow-x-auto last:mb-0">
      <table className="w-full border-collapse border-2 border-brutal-ink text-xs">
        {children}
      </table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-brutal-ink/40 bg-brutal-bg px-2 py-1 text-left font-extrabold">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-brutal-ink/40 px-2 py-1 align-top">{children}</td>
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
      const citation = citationBySource.get(refIndex);
      const label = `[${refIndex}]`;

      if (!citation || !onCitationClick) {
        if (!isStreaming) return null;
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
  }, [citations, isStreaming, onCitationClick]);

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
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={components}
      >
        {content}
      </ReactMarkdown>
      {isStreaming && (
        <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-brutal-primary align-text-bottom" />
      )}
    </div>
  );
}
