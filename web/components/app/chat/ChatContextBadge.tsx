"use client";

import { ChevronDown, FileText, Folder, Globe, Loader2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { cn } from "@/lib/cn";
import type { ChatMessage, ChatSession } from "@/lib/queries/chat";
import { useContextDocumentDetails } from "@/lib/queries/chat";

interface ChatContextBadgeProps {
  session: ChatSession;
  messages?: ChatMessage[];
}

const MISSING_DOC_TITLE = "Tài liệu không còn tồn tại";

function resolveDocumentLabel(
  session: ChatSession,
  messages?: ChatMessage[],
): string | null {
  if (session.contextLabel) return session.contextLabel;
  if (session.contextType !== "document" || !session.contextId || !messages) {
    return null;
  }
  for (const msg of messages) {
    for (const c of msg.citations) {
      if (c.documentId === session.contextId) return c.documentTitle;
    }
  }
  return null;
}

function titlesFromMessages(
  messages?: ChatMessage[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const msg of messages ?? []) {
    for (const c of msg.citations) {
      if (c.documentTitle) map.set(c.documentId, c.documentTitle);
    }
  }
  return map;
}

function mergeContextDocuments(
  session: ChatSession,
  messages: ChatMessage[] | undefined,
  fetched: Array<{ id: string; title: string }> | undefined,
): Array<{ id: string; title: string }> {
  const ids =
    session.contextIds ??
    session.contextDocuments?.map((d) => d.id) ??
    [];

  if (ids.length === 0) return session.contextDocuments ?? [];

  const byId = new Map<string, string>();

  for (const doc of session.contextDocuments ?? []) {
    if (doc.title && doc.title !== MISSING_DOC_TITLE) {
      byId.set(doc.id, doc.title);
    }
  }

  for (const [id, title] of titlesFromMessages(messages)) {
    if (!byId.has(id)) byId.set(id, title);
  }

  for (const doc of fetched ?? []) {
    if (doc.title && doc.title !== MISSING_DOC_TITLE) {
      byId.set(doc.id, doc.title);
    }
  }

  return ids.map((id) => ({
    id,
    title: byId.get(id) ?? MISSING_DOC_TITLE,
  }));
}

function ContextTypeLabel({ type }: { type: ChatSession["contextType"] }) {
  if (type === "all") return <>Toàn bộ tài liệu</>;
  if (type === "folder") return <>Một folder</>;
  if (type === "documents") return <>Nhiều tài liệu</>;
  return <>Một tài liệu</>;
}

function DocumentList({
  documents,
  isLoading,
}: {
  documents: Array<{ id: string; title: string }>;
  isLoading?: boolean;
}) {
  return (
    <div className="border-t-2 border-brutal-ink/15 px-2 py-2">
      {isLoading && (
        <div className="mb-2 flex items-center gap-2 px-2 text-xs text-brutal-muted">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Đang tải tên tài liệu…
        </div>
      )}
      <ul className="max-h-52 space-y-1.5 overflow-y-auto">
        {documents.map((doc, index) => (
          <li key={doc.id}>
            <Link
              href={`/documents/${doc.id}`}
              className="focus-brutal flex items-start gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-brutal-bg"
              title={doc.title}
            >
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-brutal-ink/30 bg-brutal-surface text-[10px] font-bold text-brutal-muted">
                {index + 1}
              </span>
              <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brutal-secondary" />
              <span className="min-w-0 flex-1 break-words font-semibold leading-snug text-brutal-ink">
                {doc.title}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ExpandableDocumentsBadge({
  session,
  messages,
}: {
  session: ChatSession;
  messages?: ChatMessage[];
}) {
  const [expanded, setExpanded] = useState(false);
  const documentIds = session.contextIds ?? [];

  const { data: fetchedDocs, isLoading } = useContextDocumentDetails(
    documentIds,
    expanded,
  );

  const documents = useMemo(
    () => mergeContextDocuments(session, messages, fetchedDocs),
    [session, messages, fetchedDocs],
  );

  const count = documents.length;

  return (
    <div className="overflow-hidden rounded-xl border-2 border-brutal-ink bg-brutal-bg text-sm">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="focus-brutal flex w-full items-start gap-2 px-3 py-2 text-left transition-colors hover:bg-brutal-surface/80"
        aria-expanded={expanded}
      >
        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-brutal-secondary" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-brutal-muted">
            <ContextTypeLabel type={session.contextType} />
          </p>
          <p className="font-semibold text-brutal-ink">
            {count} tài liệu đã chọn
          </p>
          {!expanded && session.contextLabel && (
            <p className="mt-0.5 break-words text-xs leading-snug text-brutal-muted">
              {session.contextLabel}
            </p>
          )}
          <p className="mt-1 text-xs font-medium text-brutal-primary">
            {expanded ? "Ẩn danh sách" : "Nhấn để xem danh sách"}
          </p>
        </div>
        <ChevronDown
          className={cn(
            "mt-0.5 h-4 w-4 shrink-0 text-brutal-muted transition-transform",
            expanded && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      {expanded && (
        <DocumentList documents={documents} isLoading={isLoading} />
      )}
    </div>
  );
}

export function ChatContextBadge({ session, messages }: ChatContextBadgeProps) {
  const { contextType, contextId, contextLabel } = session;
  const documentLabel = resolveDocumentLabel(session, messages);
  const folderLabel = contextLabel;

  if (contextType === "all") {
    return (
      <div className="flex items-center gap-2 rounded-xl border-2 border-brutal-ink bg-brutal-bg px-3 py-2 text-sm">
        <Globe className="h-4 w-4 shrink-0 text-brutal-secondary" />
        <span className="font-semibold text-brutal-ink">Toàn bộ tài liệu</span>
      </div>
    );
  }

  if (contextType === "folder" && contextId) {
    return (
      <Link
        href={`/drive/${contextId}`}
        className="focus-brutal flex items-start gap-2 rounded-xl border-2 border-brutal-ink bg-brutal-bg px-3 py-2 text-sm transition-all hover:-translate-y-0.5 hover:shadow-brutal-sm"
      >
        <Folder className="mt-0.5 h-4 w-4 shrink-0 text-brutal-primary" />
        <div className="min-w-0">
          <p className="text-xs font-medium text-brutal-muted">
            <ContextTypeLabel type={contextType} />
          </p>
          <p className="break-words font-semibold leading-snug text-brutal-ink">
            {folderLabel ?? "Thư mục không còn tồn tại"}
          </p>
        </div>
      </Link>
    );
  }

  if (contextType === "documents") {
    return <ExpandableDocumentsBadge session={session} messages={messages} />;
  }

  if (contextType === "document" && contextId) {
    return (
      <Link
        href={`/documents/${contextId}`}
        className="focus-brutal flex items-start gap-2 rounded-xl border-2 border-brutal-ink bg-brutal-bg px-3 py-2 text-sm transition-all hover:-translate-y-0.5 hover:shadow-brutal-sm"
      >
        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-brutal-secondary" />
        <div className="min-w-0">
          <p className="text-xs font-medium text-brutal-muted">
            <ContextTypeLabel type={contextType} />
          </p>
          <p className="break-words font-semibold leading-snug text-brutal-ink">
            {documentLabel ?? "Tài liệu không còn tồn tại"}
          </p>
        </div>
      </Link>
    );
  }

  return null;
}
