"use client";

import {
  Download,
  FileText,
  Globe,
  MoreVertical,
  Presentation,
  Share2,
  Star,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";

import { ContextMenu } from "@/components/ui/ContextMenu";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/cn";
import type { DriveDocument } from "@/lib/queries/drive";
import {
  useDeleteDocument,
  useDocumentDownloadUrl,
  useToggleDocumentStar,
} from "@/lib/queries/documents";
import { formatSharedAt } from "@/lib/queries/shares";

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
  return "#dbeafe";
}

function formatBytes(bytes: number): string {
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  if (bytes >= 1_024) return `${(bytes / 1_024).toFixed(0)} KB`;
  return `${bytes} B`;
}

interface DocumentCardProps {
  document: DriveDocument;
  parentId?: string;
  variant?: "default" | "shared";
  sharedAt?: string;
  onRename: (doc: DriveDocument) => void;
  onShare?: (doc: DriveDocument) => void;
}

export function DocumentCard({
  document: doc,
  parentId,
  variant = "default",
  sharedAt,
  onRename,
  onShare,
}: DocumentCardProps) {
  const isShared = variant === "shared";
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [triggerDownload, setTriggerDownload] = useState(false);

  const { mutate: toggleStar } = useToggleDocumentStar(parentId);
  const { mutate: deleteDoc } = useDeleteDocument(doc.id, parentId);
  const { data: downloadData } = useDocumentDownloadUrl(doc.id, triggerDownload);

  if (triggerDownload && downloadData?.downloadUrl) {
    window.open(downloadData.downloadUrl, "_blank", "noopener,noreferrer");
    setTriggerDownload(false);
  }

  const menuItems = isShared
    ? [
        {
          label: "Tải xuống",
          icon: <Download className="h-4 w-4" />,
          onClick: () => setTriggerDownload(true),
        },
      ]
    : [
        {
          label: "Tải xuống",
          icon: <Download className="h-4 w-4" />,
          onClick: () => setTriggerDownload(true),
        },
        ...(onShare
          ? [
              {
                label: "Chia sẻ",
                icon: <Share2 className="h-4 w-4" />,
                onClick: () => onShare(doc),
              },
            ]
          : []),
        {
          label: doc.isStarred ? "Bỏ gắn sao" : "Gắn sao",
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
          label: "Đổi tên",
          icon: <span className="text-base leading-none">✏️</span>,
          onClick: () => onRename(doc),
        },
        {
          label: "Chuyển vào thùng rác",
          icon: <Trash2 className="h-4 w-4 text-brutal-danger" />,
          onClick: () => deleteDoc(),
          danger: true,
        },
      ];

  return (
    <div
      className={cn(
        "brutal-card brutal-card-hover group relative flex flex-col gap-2 p-3 cursor-pointer select-none",
        menuOpen && "z-[var(--z-dropdown)]",
      )}
    >
      <Link
        href={`/documents/${doc.id}`}
        className="focus-brutal absolute inset-0 rounded-2xl"
        aria-label={`Open document ${doc.title}`}
      />

      <div className="flex items-start justify-between gap-2">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-brutal-ink shadow-brutal-sm"
          style={{ backgroundColor: fileIconBg(doc.mimeType) }}
          aria-hidden="true"
        >
          <FileIcon mimeType={doc.mimeType} />
        </div>

        {!isShared && (
          <div className="relative z-10 ml-auto flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              id={`doc-star-${doc.id}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleStar({
                  documentId: doc.id,
                  starred: !doc.isStarred,
                });
              }}
              className="focus-brutal flex h-8 w-8 items-center justify-center rounded-lg border-2 border-transparent transition-all hover:border-brutal-ink hover:bg-brutal-bg hover:shadow-brutal-sm"
              aria-label={doc.isStarred ? "Bỏ đánh dấu sao" : "Đánh dấu sao"}
              aria-pressed={doc.isStarred}
            >
              <Star
                className={cn(
                  "h-4 w-4 text-brutal-muted",
                  doc.isStarred &&
                    "fill-brutal-primary text-brutal-primary",
                )}
              />
            </button>

            {menuItems.length > 0 && (
              <>
                <button
                  ref={menuButtonRef}
                  id={`doc-menu-${doc.id}`}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setMenuOpen((v) => !v);
                  }}
                  className="focus-brutal flex h-8 w-8 items-center justify-center rounded-lg border-2 border-transparent transition-all hover:border-brutal-ink hover:bg-brutal-bg hover:shadow-brutal-sm"
                  aria-label={`Actions for ${doc.title}`}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                >
                  <MoreVertical className="h-4 w-4" />
                </button>

                {menuOpen && (
                  <ContextMenu
                    anchorRef={menuButtonRef}
                    onClose={() => setMenuOpen(false)}
                    items={menuItems}
                  />
                )}
              </>
            )}
          </div>
        )}
      </div>

      <p className="truncate text-sm font-bold text-brutal-ink leading-snug">
        {doc.title}
      </p>

      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1">
          <StatusBadge status={doc.status} />
          {doc.visibility === "public" && (
            <span
              className="inline-flex items-center gap-0.5 rounded-md border-2 border-brutal-ink bg-brutal-bg px-1.5 py-0.5 text-xs font-bold"
              title="Tài liệu công khai"
            >
              <Globe className="h-3 w-3" />
            </span>
          )}
        </div>
        <span className="text-xs text-brutal-muted tabular-nums">
          {formatBytes(doc.fileSizeBytes)}
        </span>
      </div>
      {isShared && sharedAt && (
        <p className="text-xs text-brutal-muted">
          Chia sẻ {formatSharedAt(sharedAt)}
        </p>
      )}
    </div>
  );
}
