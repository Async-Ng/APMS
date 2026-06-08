"use client";

import { FileText, Folder, Globe } from "lucide-react";
import Link from "next/link";

import type { ChatMessage, ChatSession } from "@/lib/queries/chat";

interface ChatContextBadgeProps {
  session: ChatSession;
  messages?: ChatMessage[];
}

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

function ContextTypeLabel({ type }: { type: ChatSession["contextType"] }) {
  if (type === "all") return <>Toàn bộ tài liệu</>;
  if (type === "folder") return <>Một folder</>;
  if (type === "documents") return <>Nhiều tài liệu</>;
  return <>Một tài liệu</>;
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
          <p className="truncate font-semibold text-brutal-ink">
            {folderLabel ?? "Folder không còn tồn tại"}
          </p>
        </div>
      </Link>
    );
  }

  if (contextType === "documents") {
    return (
      <div className="flex items-start gap-2 rounded-xl border-2 border-brutal-ink bg-brutal-bg px-3 py-2 text-sm">
        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-brutal-secondary" />
        <div className="min-w-0">
          <p className="text-xs font-medium text-brutal-muted">
            <ContextTypeLabel type={contextType} />
          </p>
          <p className="truncate font-semibold text-brutal-ink">
            {contextLabel ?? "Không xác định"}
          </p>
        </div>
      </div>
    );
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
          <p className="truncate font-semibold text-brutal-ink">
            {documentLabel ?? "Tài liệu không còn tồn tại"}
          </p>
        </div>
      </Link>
    );
  }

  return null;
}
