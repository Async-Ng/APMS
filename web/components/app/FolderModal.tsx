"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { BrutalButton } from "@/components/ui/BrutalButton";
import { BrutalCard } from "@/components/ui/BrutalCard";
import type { DriveDocument, DriveFolder } from "@/lib/queries/drive";
import { useCreateFolder, useUpdateFolder } from "@/lib/queries/drive";
import { useUpdateDocument } from "@/lib/queries/documents";

const FOLDER_COLORS = [
  { label: "Orange", value: "#F37021" }, // FPT Orange
  { label: "Blue", value: "#2B8FD4" },   // FPT Blue
  { label: "Green", value: "#33B04A" },  // FPT Green
  { label: "Rose", value: "#f43f5e" },
  { label: "Amber", value: "#f59e0b" },
  { label: "Slate", value: "#64748b" },
] as const;

interface FolderModalProps {
  /** The parent folder ID when creating a new subfolder */
  parentId: string | null;
  /** If provided, we're renaming an existing folder */
  folder?: DriveFolder;
  /** If provided, we're renaming a document (re-uses this modal) */
  documentToRename?: DriveDocument;
  onClose: () => void;
}

export function FolderModal({
  parentId,
  folder,
  documentToRename,
  onClose,
}: FolderModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isDocRename = !!documentToRename;
  const isRename = !!folder;
  const isCreate = !isRename && !isDocRename;

  const [name, setName] = useState(
    folder?.name ?? documentToRename?.title ?? "",
  );
  const [color, setColor] = useState<string>(
    folder?.color ?? FOLDER_COLORS[0].value,
  );
  const [error, setError] = useState<string | null>(null);

  // Focus input on open
  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  // Keyboard: close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const createFolder = useCreateFolder(parentId ?? undefined);
  const updateFolder = useUpdateFolder(folder?.id ?? "", parentId ?? undefined);
  const updateDocument = useUpdateDocument(
    documentToRename?.id ?? "",
    parentId ?? undefined,
  );

  const isPending =
    createFolder.isPending || updateFolder.isPending || updateDocument.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name cannot be empty.");
      return;
    }

    try {
      if (isDocRename) {
        await updateDocument.mutateAsync({ title: trimmed });
      } else if (isRename) {
        await updateFolder.mutateAsync({ name: trimmed, color });
      } else {
        await createFolder.mutateAsync({
          name: trimmed,
          parentId: parentId ?? null,
          color,
        });
      }
      onClose();
    } catch {
      setError("Something went wrong. Please try again.");
    }
  }

  const title = isDocRename
    ? "Rename File"
    : isRename
      ? "Rename Folder"
      : "New Folder";

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{
        zIndex: "var(--z-modal-overlay)",
        backgroundColor: "rgba(26,26,26,0.5)",
        backdropFilter: "blur(2px)",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="folder-modal-title"
    >
      <BrutalCard
        className="w-full max-w-sm"
        style={{ zIndex: "var(--z-modal)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 id="folder-modal-title" className="font-heading text-xl font-extrabold">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="focus-brutal flex h-8 w-8 items-center justify-center rounded-lg border-2 border-brutal-ink transition-colors hover:bg-brutal-bg"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="mt-5 space-y-4" noValidate>
          {/* Name input */}
          <div className="space-y-1.5">
            <label
              htmlFor="folder-name-input"
              className="block text-sm font-semibold text-brutal-ink"
            >
              {isDocRename ? "File title" : "Folder name"}{" "}
              <span className="text-brutal-danger" aria-hidden="true">*</span>
            </label>
            <input
              id="folder-name-input"
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              required
              maxLength={100}
              className="focus-brutal w-full rounded-xl border-2 border-brutal-ink bg-brutal-surface px-3 py-2.5 text-sm font-medium text-brutal-ink placeholder:text-brutal-muted shadow-brutal-sm outline-none"
              placeholder={isDocRename ? "Enter file title…" : "e.g. Physics Notes"}
              aria-describedby={error ? "folder-name-error" : undefined}
            />
            {error && (
              <p
                id="folder-name-error"
                role="alert"
                className="text-xs font-medium text-brutal-danger"
              >
                {error}
              </p>
            )}
          </div>

          {/* Color picker — only for folders */}
          {!isDocRename && (
            <div className="space-y-1.5">
              <p className="text-sm font-semibold text-brutal-ink">Color</p>
              <div className="flex gap-2">
                {FOLDER_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setColor(c.value)}
                    className="focus-brutal h-8 w-8 rounded-lg border-2 transition-transform hover:scale-110"
                    style={{
                      backgroundColor: c.value,
                      borderColor:
                        color === c.value ? "#1A1A1A" : "transparent",
                      boxShadow:
                        color === c.value
                          ? "2px 2px 0 0 #1A1A1A"
                          : "none",
                    }}
                    aria-label={`Color: ${c.label}`}
                    aria-pressed={color === c.value}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <BrutalButton
              type="button"
              variant="ghost"
              className="flex-1"
              onClick={onClose}
              disabled={isPending}
            >
              Cancel
            </BrutalButton>
            <BrutalButton
              type="submit"
              variant="primary"
              className="flex-1"
              disabled={isPending || !name.trim()}
            >
              {isPending ? "Saving…" : isCreate ? "Create" : "Save"}
            </BrutalButton>
          </div>
        </form>
      </BrutalCard>
    </div>
  );
}
