"use client";

import {
  Download,
  FileText,
  MoreVertical,
  Presentation,
  Star,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { ContextMenu } from "@/components/ui/ContextMenu";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/cn";
import type { DriveDocument } from "@/lib/queries/drive";
import {
  useDeleteDocument,
  useDocumentDownloadUrl,
  useToggleDocumentStar,
} from "@/lib/queries/documents";

/* File-type icon mapping */
function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.includes("pdf"))
    return (
      <FileText className="h-6 w-6 text-brutal-danger" strokeWidth={2} />
    );
  if (mimeType.includes("presentation"))
    return (
      <Presentation className="h-6 w-6 text-brutal-primary" strokeWidth={2} />
    );
  return <FileText className="h-6 w-6 text-brutal-secondary" strokeWidth={2} />;
}

function fileIconBg(mimeType: string): string {
  if (mimeType.includes("pdf")) return "#fee2e2";
  if (mimeType.includes("presentation")) return "#fff7ed";
  return "#dbeafe"; // docx → blue
}

function formatBytes(bytes: number): string {
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  if (bytes >= 1_024) return `${(bytes / 1_024).toFixed(0)} KB`;
  return `${bytes} B`;
}

interface DocumentCardProps {
  document: DriveDocument;
  parentId?: string;
  onRename: (doc: DriveDocument) => void;
}

export function DocumentCard({
  document: doc,
  parentId,
  onRename,
}: DocumentCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [triggerDownload, setTriggerDownload] = useState(false);

  const { mutate: toggleStar } = useToggleDocumentStar(parentId);
  const { mutate: deleteDoc } = useDeleteDocument(doc.id, parentId);
  const { data: downloadData } = useDocumentDownloadUrl(doc.id, triggerDownload);

  // Open download URL when it arrives
  if (triggerDownload && downloadData?.downloadUrl) {
    window.open(downloadData.downloadUrl, "_blank", "noopener,noreferrer");
    setTriggerDownload(false);
  }

  return (
    <div className="brutal-card brutal-card-hover group relative flex flex-col gap-2 p-3 cursor-pointer select-none">
      {/* Document body — navigate on click */}
      <Link
        href={`/documents/${doc.id}`}
        className="focus-brutal absolute inset-0 rounded-2xl"
        aria-label={`Open document ${doc.title}`}
      />

      {/* Icon row */}
      <div className="flex items-start justify-between">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-brutal-ink shadow-brutal-sm"
          style={{ backgroundColor: fileIconBg(doc.mimeType) }}
          aria-hidden="true"
        >
          <FileIcon mimeType={doc.mimeType} />
        </div>

        {/* Context menu trigger */}
        <div className="relative z-10">
          <button
            id={`doc-menu-${doc.id}`}
            onClick={() => setMenuOpen((v) => !v)}
            className="focus-brutal flex h-8 w-8 items-center justify-center rounded-lg border-2 border-transparent transition-all hover:border-brutal-ink hover:bg-brutal-bg hover:shadow-brutal-sm"
            aria-label={`Actions for ${doc.title}`}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <MoreVertical className="h-4 w-4" />
          </button>

          {menuOpen && (
            <ContextMenu
              onClose={() => setMenuOpen(false)}
              items={[
                {
                  label: "Download",
                  icon: <Download className="h-4 w-4" />,
                  onClick: () => setTriggerDownload(true),
                },
                {
                  label: doc.isStarred ? "Unstar" : "Star",
                  icon: (
                    <Star
                      className={cn(
                        "h-4 w-4",
                        doc.isStarred &&
                          "fill-brutal-primary text-brutal-primary",
                      )}
                    />
                  ),
                  onClick: () =>
                    toggleStar({
                      documentId: doc.id,
                      starred: !doc.isStarred,
                    }),
                },
                {
                  label: "Rename",
                  icon: <span className="text-base leading-none">✏️</span>,
                  onClick: () => onRename(doc),
                },
                {
                  label: "Move to Trash",
                  icon: <Trash2 className="h-4 w-4 text-brutal-danger" />,
                  onClick: () => deleteDoc(),
                  danger: true,
                },
              ]}
            />
          )}
        </div>
      </div>

      {/* Title */}
      <p className="truncate text-sm font-bold text-brutal-ink leading-snug">
        {doc.title}
      </p>

      {/* Meta row */}
      <div className="flex items-center justify-between gap-1">
        <StatusBadge status={doc.status} />
        <span className="text-xs text-brutal-muted tabular-nums">
          {formatBytes(doc.fileSizeBytes)}
        </span>
      </div>

      {/* Star indicator */}
      {doc.isStarred && (
        <Star
          className="absolute bottom-2 right-2 h-3.5 w-3.5 fill-brutal-primary text-brutal-primary"
          aria-label="Starred"
        />
      )}
    </div>
  );
}
