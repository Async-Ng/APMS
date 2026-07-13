"use client";

import {
  Download,
  FileText,
  FolderInput,
  Globe,
  MoreVertical,
  Presentation,
  Share2,
  Star,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { ContextMenu } from "@/components/ui/ContextMenu";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useStarPulse } from "@/components/ui/useStarPulse";
import { cn } from "@/lib/cn";
import {
  PUBLISH_TO_LIBRARY_CONFIRM_DESCRIPTION,
  PUBLISH_TO_LIBRARY_CONFIRM_TITLE,
} from "@/lib/document-visibility";
import { getUserErrorMessage } from "@/lib/errors";
import { formatBytes } from "@/lib/format";
import { driveKey, type DriveDocument } from "@/lib/queries/drive";
import {
  useDeleteDocument,
  useDocumentDownloadUrl,
  useToggleDocumentStar,
  useUpdateDocument,
} from "@/lib/queries/documents";
import { formatSharedAt } from "@/lib/queries/shares";
import { FolderPickerModal } from "./FolderPickerModal";

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
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);
  const [movePickerOpen, setMovePickerOpen] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [triggerDownload, setTriggerDownload] = useState(false);
  const starPulse = useStarPulse(doc.isStarred);
  const qc = useQueryClient();

  const { mutate: toggleStar } = useToggleDocumentStar(parentId);
  const { mutate: deleteDoc } = useDeleteDocument(doc.id, parentId);
  const {
    mutate: updateDoc,
    mutateAsync: updateDocAsync,
    isPending: isUpdatingVisibility,
  } = useUpdateDocument(doc.id, parentId);
  const { data: downloadData } = useDocumentDownloadUrl(doc.id, triggerDownload);

  async function moveDocument(targetFolderId: string | null) {
    setMoveError(null);
    try {
      await updateDocAsync({ folderId: targetFolderId });
      void qc.invalidateQueries({ queryKey: driveKey(targetFolderId ?? undefined) });
      setMovePickerOpen(false);
    } catch (err) {
      setMoveError(getUserErrorMessage(err));
    }
  }

  const canManageLibrary = doc.status === "ready" && !!doc.courseSlotId;

  function revokeFromLibrary() {
    updateDoc({ visibility: "private" });
  }

  function requestPublishToLibrary() {
    setMenuOpen(false);
    setPublishConfirmOpen(true);
  }

  function confirmPublishToLibrary() {
    updateDoc(
      { visibility: "public" },
      { onSuccess: () => setPublishConfirmOpen(false) },
    );
  }

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
        ...(canManageLibrary
          ? [
              {
                label:
                  doc.visibility === "public"
                    ? "Thu hồi khỏi thư viện"
                    : "Đăng lên thư viện",
                icon: <Globe className="h-4 w-4" />,
                onClick: () =>
                  doc.visibility === "public"
                    ? revokeFromLibrary()
                    : requestPublishToLibrary(),
                disabled: isUpdatingVisibility,
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
          label: "Chỉnh sửa",
          icon: <span className="text-base leading-none">✏️</span>,
          onClick: () => onRename(doc),
        },
        {
          label: "Di chuyển đến...",
          icon: <FolderInput className="h-4 w-4" />,
          onClick: () => setMovePickerOpen(true),
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
                  starPulse && "star-pulse",
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
          <StatusBadge status={doc.status} createdAt={doc.createdAt} />
          {doc.visibility === "public" && (
            <span
              className="inline-flex items-center gap-0.5 rounded-md border-2 border-brutal-ink bg-brutal-bg px-1.5 py-0.5 text-xs font-bold"
              title="Công khai (Thư viện)"
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

      <ConfirmDialog
        open={publishConfirmOpen}
        title={PUBLISH_TO_LIBRARY_CONFIRM_TITLE}
        description={PUBLISH_TO_LIBRARY_CONFIRM_DESCRIPTION}
        confirmLabel="Đăng lên thư viện"
        isPending={isUpdatingVisibility}
        onConfirm={confirmPublishToLibrary}
        onClose={() => setPublishConfirmOpen(false)}
      />

      {movePickerOpen && (
        <FolderPickerModal
          title={`Di chuyển "${doc.title}"`}
          initialFolderId={doc.folderId}
          isPending={isUpdatingVisibility}
          submitError={moveError}
          onConfirm={(folderId) => void moveDocument(folderId)}
          onClose={() => setMovePickerOpen(false)}
        />
      )}
    </div>
  );
}
