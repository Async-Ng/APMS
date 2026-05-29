"use client";

import { Folder, MoreVertical, Star, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { ContextMenu } from "@/components/ui/ContextMenu";
import { cn } from "@/lib/cn";
import { useDeleteFolder, useToggleFolderStar } from "@/lib/queries/drive";
import type { DriveFolder } from "@/lib/queries/drive";

/** Map a folder color (hex or null) to a Tailwind-friendly inline style. */
function folderIconColor(color: string | null): string {
  return color ?? "var(--color-fpt-orange)";
}

interface FolderCardProps {
  folder: DriveFolder;
  parentId?: string;
  onRename: (folder: DriveFolder) => void;
}

export function FolderCard({ folder, parentId, onRename }: FolderCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { mutate: toggleStar } = useToggleFolderStar(parentId);
  const { mutate: deleteFolder } = useDeleteFolder(folder.id, parentId);

  return (
    <div
      className={cn(
        "brutal-card brutal-card-hover group relative flex flex-col gap-2 p-3",
        "cursor-pointer select-none",
      )}
    >
      {/* Folder body — navigate on click */}
      <Link
        href={`/drive/${folder.id}`}
        className="focus-brutal absolute inset-0 rounded-2xl"
        aria-label={`Open folder ${folder.name}`}
      />

      {/* Icon row */}
      <div className="flex items-start justify-between">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-brutal-ink shadow-brutal-sm"
          style={{ backgroundColor: folderIconColor(folder.color) }}
          aria-hidden="true"
        >
          <Folder className="h-6 w-6 text-white" strokeWidth={2} />
        </div>

        {/* Context menu trigger — above the Link overlay */}
        <div className="relative z-10">
          <button
            id={`folder-menu-${folder.id}`}
            onClick={(e) => {
              e.preventDefault();
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
              onClose={() => setMenuOpen(false)}
              items={[
                {
                  label: folder.isStarred ? "Unstar" : "Star",
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
                  label: "Rename",
                  icon: <span className="text-base">✏️</span>,
                  onClick: () => onRename(folder),
                },
                {
                  label: "Move to Trash",
                  icon: <Trash2 className="h-4 w-4 text-brutal-danger" />,
                  onClick: () => deleteFolder(),
                  danger: true,
                },
              ]}
            />
          )}
        </div>
      </div>

      {/* Name */}
      <p className="truncate text-sm font-bold text-brutal-ink leading-snug">
        {folder.name}
      </p>

      {/* Star indicator */}
      {folder.isStarred && (
        <Star
          className="absolute bottom-2 right-2 h-3.5 w-3.5 fill-brutal-primary text-brutal-primary"
          aria-label="Starred"
        />
      )}
    </div>
  );
}
