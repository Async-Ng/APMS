"use client";

import { Folder, MoreVertical, Share2, Star, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";

import { ContextMenu } from "@/components/ui/ContextMenu";
import { useStarPulse } from "@/components/ui/useStarPulse";
import { cn } from "@/lib/cn";
import { useDeleteFolder, useToggleFolderStar } from "@/lib/queries/drive";
import type { DriveFolder } from "@/lib/queries/drive";
import { formatSharedAt } from "@/lib/queries/shares";

/** Map a folder color (hex or null) to a Tailwind-friendly inline style. */
function folderIconColor(color: string | null): string {
  return color ?? "var(--color-fpt-orange)";
}

interface FolderCardProps {
  folder: DriveFolder;
  parentId?: string;
  variant?: "default" | "shared";
  sharedAt?: string;
  href?: string;
  onRename: (folder: DriveFolder) => void;
  onShare?: (folder: DriveFolder) => void;
}

export function FolderCard({
  folder,
  parentId,
  variant = "default",
  sharedAt,
  href,
  onRename,
  onShare,
}: FolderCardProps) {
  const isShared = variant === "shared";
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const starPulse = useStarPulse(folder.isStarred);
  const { mutate: toggleStar } = useToggleFolderStar(parentId);
  const { mutate: deleteFolder } = useDeleteFolder(folder.id, parentId);

  const menuItems = isShared
    ? []
    : [
        ...(onShare
          ? [
              {
                label: "Chia sẻ",
                icon: <Share2 className="h-4 w-4" />,
                onClick: () => onShare(folder),
              },
            ]
          : []),
        {
          label: folder.isStarred ? "Bỏ gắn sao" : "Gắn sao",
          icon: (
            <Star
              className={cn(
                "h-4 w-4",
                folder.isStarred && "fill-brutal-primary text-brutal-primary",
              )}
            />
          ),
          onClick: () =>
            toggleStar({
              folderId: folder.id,
              starred: !folder.isStarred,
            }),
        },
        {
          label: "Đổi tên",
          icon: <span className="text-base">✏️</span>,
          onClick: () => onRename(folder),
        },
        {
          label: "Chuyển vào thùng rác",
          icon: <Trash2 className="h-4 w-4 text-brutal-danger" />,
          onClick: () => deleteFolder(),
          danger: true,
        },
      ];

  return (
    <div
      className={cn(
        "brutal-card brutal-card-hover group relative flex flex-col gap-2 p-3",
        "cursor-pointer select-none",
        menuOpen && "z-[var(--z-dropdown)]",
      )}
    >
      <Link
        href={href ?? `/drive/${folder.id}`}
        className="focus-brutal absolute inset-0 rounded-2xl"
        aria-label={`Open folder ${folder.name}`}
      />

      <div className="flex items-start justify-between gap-2">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-brutal-ink shadow-brutal-sm"
          style={{ backgroundColor: folderIconColor(folder.color) }}
          aria-hidden="true"
        >
          <Folder className="h-6 w-6 text-white" strokeWidth={2} />
        </div>

        {!isShared && (
          <div className="relative z-10 ml-auto flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              id={`folder-star-${folder.id}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleStar({
                  folderId: folder.id,
                  starred: !folder.isStarred,
                });
              }}
              className="focus-brutal flex h-8 w-8 items-center justify-center rounded-lg border-2 border-transparent transition-all hover:border-brutal-ink hover:bg-brutal-bg hover:shadow-brutal-sm"
              aria-label={folder.isStarred ? "Bỏ đánh dấu sao" : "Đánh dấu sao"}
              aria-pressed={folder.isStarred}
            >
              <Star
                className={cn(
                  "h-4 w-4 text-brutal-muted",
                  folder.isStarred &&
                    "fill-brutal-primary text-brutal-primary",
                  starPulse && "star-pulse",
                )}
              />
            </button>

            {menuItems.length > 0 && (
              <>
                <button
                  ref={menuButtonRef}
                  id={`folder-menu-${folder.id}`}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setMenuOpen((v) => !v);
                  }}
                  className="focus-brutal flex h-8 w-8 items-center justify-center rounded-lg border-2 border-transparent transition-all hover:border-brutal-ink hover:bg-brutal-bg hover:shadow-brutal-sm"
                  aria-label={`Actions for ${folder.name}`}
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
        {folder.name}
      </p>
      {isShared && sharedAt && (
        <p className="text-xs text-brutal-muted">
          Chia sẻ {formatSharedAt(sharedAt)}
        </p>
      )}
    </div>
  );
}
