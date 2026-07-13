"use client";

import { ChevronRight, Folder, HardDrive, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { BrutalButton } from "@/components/ui/BrutalButton";
import { BrutalCard } from "@/components/ui/BrutalCard";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { useModalA11y } from "@/components/ui/useModalA11y";
import { cn } from "@/lib/cn";
import { useDriveContents } from "@/lib/queries/drive";

interface FolderPickerModalProps {
  title: string;
  /** Folder currently containing the item being moved (pre-selected as target). */
  initialFolderId: string | null;
  /** For folder moves: the folder being moved must not be enterable/selectable
   *  (also keeps its descendants unreachable since the picker only drills down). */
  excludeFolderId?: string;
  isPending?: boolean;
  /** Error from the last move attempt (e.g. FOLDER_CYCLE), shown inline. */
  submitError?: string | null;
  onConfirm: (folderId: string | null) => void;
  onClose: () => void;
}

interface Crumb {
  id: string | null;
  name: string;
}

export function FolderPickerModal({
  title,
  initialFolderId,
  excludeFolderId,
  isPending,
  submitError,
  onConfirm,
  onClose,
}: FolderPickerModalProps) {
  const [trail, setTrail] = useState<Crumb[]>([
    { id: null, name: "Drive của tôi" },
  ]);
  const current = trail[trail.length - 1]!;

  const dialogRef = useRef<HTMLDivElement>(null);
  useModalA11y(true, onClose, dialogRef, { preventClose: isPending });

  const { data, isLoading, error } = useDriveContents(current.id ?? undefined);

  const folders = useMemo(
    () => (data?.folders ?? []).filter((f) => f.id !== excludeFolderId),
    [data, excludeFolderId],
  );

  const targetIsUnchanged = current.id === initialFolderId;

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{
        zIndex: "var(--z-modal-overlay)",
        backgroundColor: "rgba(26,26,26,0.5)",
        backdropFilter: "blur(2px)",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="folder-picker-title"
    >
      <BrutalCard className="flex w-full max-w-md flex-col" style={{ zIndex: "var(--z-modal)" }}>
        <div className="flex items-center justify-between">
          <h2 id="folder-picker-title" className="font-heading text-xl font-extrabold">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="focus-brutal flex h-8 w-8 items-center justify-center rounded-lg border-2 border-brutal-ink transition-colors hover:bg-brutal-bg"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav aria-label="Đường dẫn" className="mt-4 flex flex-wrap items-center gap-1 text-sm font-medium">
          {trail.map((crumb, index) => {
            const isLast = index === trail.length - 1;
            return (
              <span key={crumb.id ?? "root"} className="flex items-center gap-1">
                {index === 0 && (
                  <HardDrive className="h-3.5 w-3.5 shrink-0 text-brutal-muted" aria-hidden="true" />
                )}
                <button
                  type="button"
                  disabled={isLast}
                  onClick={() => setTrail(trail.slice(0, index + 1))}
                  className={cn(
                    "focus-brutal max-w-[140px] truncate rounded px-1 py-0.5",
                    isLast
                      ? "font-bold text-brutal-ink"
                      : "text-brutal-muted transition-colors hover:text-brutal-ink",
                  )}
                >
                  {crumb.name}
                </button>
                {!isLast && (
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-brutal-muted" aria-hidden="true" />
                )}
              </span>
            );
          })}
        </nav>

        <div className="mt-3 max-h-80 min-h-40 space-y-1 overflow-y-auto rounded-xl border-2 border-brutal-ink bg-brutal-surface p-2">
          {isLoading && (
            <p className="p-2 text-sm text-brutal-muted">Đang tải…</p>
          )}
          {!isLoading && folders.length === 0 && (
            <p className="p-2 text-sm text-brutal-muted">Không có thư mục con.</p>
          )}
          {folders.map((folder) => (
            <button
              key={folder.id}
              type="button"
              onClick={() => setTrail([...trail, { id: folder.id, name: folder.name }])}
              className="focus-brutal flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm font-semibold text-brutal-ink transition-colors hover:bg-brutal-bg"
            >
              <Folder
                className="h-4 w-4 shrink-0"
                style={{ color: folder.color ?? "var(--color-fpt-orange)" }}
              />
              <span className="truncate">{folder.name}</span>
              <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-brutal-muted" aria-hidden="true" />
            </button>
          ))}
        </div>

        {error && <ErrorAlert message="Không thể tải danh sách thư mục." variant="inline" />}
        {submitError && <ErrorAlert message={submitError} variant="inline" />}

        <div className="mt-4 flex gap-2">
          <BrutalButton variant="ghost" className="flex-1" onClick={onClose} disabled={isPending}>
            Huỷ
          </BrutalButton>
          <BrutalButton
            variant="primary"
            className="flex-1"
            onClick={() => onConfirm(current.id)}
            loading={isPending}
            disabled={targetIsUnchanged}
          >
            Chuyển vào đây
          </BrutalButton>
        </div>
      </BrutalCard>
    </div>
  );
}
