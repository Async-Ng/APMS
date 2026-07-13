"use client";

import { MessageSquare } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/cn";

interface AskAiLinkProps {
  href: string;
  className?: string;
  id?: string;
  /** topbar: inline next to New Folder; block: full-width sidebar button */
  layout?: "topbar" | "block";
}

/** Link to start an AI chat — uses brutal-btn (same as Upload), not nested BrutalButton. */
export function AskAiLink({
  href,
  className,
  id,
  layout = "topbar",
}: AskAiLinkProps) {
  return (
    <Link
      id={id}
      href={href}
      className={cn(
        "brutal-btn brutal-btn-md brutal-btn-ghost focus-brutal w-auto whitespace-nowrap",
        layout === "topbar" && "hidden shrink-0 sm:inline-flex",
        layout === "block" && "flex w-full justify-center",
        className,
      )}
    >
      <MessageSquare className="h-4 w-4 shrink-0" aria-hidden="true" />
      Hỏi AI
    </Link>
  );
}
