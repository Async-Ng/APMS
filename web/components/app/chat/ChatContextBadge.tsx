"use client";

import { FileText, Folder, Globe } from "lucide-react";
import Link from "next/link";

import type { ChatSession } from "@/lib/queries/chat";

interface ChatContextBadgeProps {
  session: ChatSession;
}

export function ChatContextBadge({ session }: ChatContextBadgeProps) {
  const { contextType, contextId } = session;

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
        className="focus-brutal flex items-center gap-2 rounded-xl border-2 border-brutal-ink bg-brutal-bg px-3 py-2 text-sm transition-all hover:-translate-y-0.5 hover:shadow-brutal-sm"
      >
        <Folder className="h-4 w-4 shrink-0 text-brutal-primary" />
        <span className="font-semibold text-brutal-ink">Folder scope</span>
      </Link>
    );
  }

  if (contextType === "document" && contextId) {
    return (
      <Link
        href={`/documents/${contextId}`}
        className="focus-brutal flex items-center gap-2 rounded-xl border-2 border-brutal-ink bg-brutal-bg px-3 py-2 text-sm transition-all hover:-translate-y-0.5 hover:shadow-brutal-sm"
      >
        <FileText className="h-4 w-4 shrink-0 text-brutal-secondary" />
        <span className="font-semibold text-brutal-ink">Một tài liệu</span>
      </Link>
    );
  }

  return null;
}
