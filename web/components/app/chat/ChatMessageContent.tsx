import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

const components: Components = {
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
      className="underline text-brutal-secondary"
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
}

export function ChatMessageContent({ content }: ChatMessageContentProps) {
  return (
    <div className="text-sm font-medium leading-relaxed">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
