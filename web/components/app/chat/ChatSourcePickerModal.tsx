"use client";

import {
  Check,
  ChevronRight,
  FileText,
  Folder,
  Globe,
  Presentation,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { FileGrid } from "@/components/app/FileGrid";
import { BrutalButton } from "@/components/ui/BrutalButton";
import { BrutalCard } from "@/components/ui/BrutalCard";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/cn";
import type { CreateSessionBody } from "@/lib/queries/chat";
import { getApiErrorMessage, useCreateSession } from "@/lib/queries/chat";
import type { DriveDocument, DriveFolder } from "@/lib/queries/drive";
import { useDriveContents } from "@/lib/queries/drive";

type PickerStep = "browse" | "review";

/** A document can be chatted with once it's ready, or while still processing if it already has chunks indexed. */
function canChatWithDocument(doc: DriveDocument): boolean {
  return doc.status === "ready" || (doc.status === "processing" && (doc.chunkCount ?? 0) > 0);
}

type Selection =
  | { kind: "all" }
  | { kind: "folder"; folder: DriveFolder }
  | { kind: "documents"; documents: DriveDocument[] };

interface BreadcrumbItem {
  id: string | undefined;
  name: string;
  folder?: DriveFolder;
}

interface ChatSourcePickerModalProps {
  open: boolean;
  onClose: () => void;
  onSessionCreated: (sessionId: string) => void;
}

function folderIconColor(color: string | null): string {
  return color ?? "var(--color-fpt-orange)";
}

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.includes("presentation")) {
    return <Presentation className="h-6 w-6 text-brutal-primary" strokeWidth={2} />;
  }
  return <FileText className="h-6 w-6 text-brutal-secondary" strokeWidth={2} />;
}

function fileIconBg(mimeType: string): string {
  if (mimeType.includes("pdf")) return "#fee2e2";
  if (mimeType.includes("presentation")) return "#fff7ed";
  return "#dbeafe";
}

function PickerFolderTile({
  folder,
  onOpen,
}: {
  folder: DriveFolder;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="brutal-card brutal-card-hover focus-brutal flex flex-col gap-2 p-3 text-left"
    >
      <div
        className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-brutal-ink shadow-brutal-sm"
        style={{ backgroundColor: folderIconColor(folder.color) }}
        aria-hidden="true"
      >
        <Folder className="h-6 w-6 text-white" strokeWidth={2} />
      </div>
      <p className="truncate text-sm font-bold text-brutal-ink">{folder.name}</p>
    </button>
  );
}

function PickerDocumentTile({
  doc,
  selected,
  onToggle,
}: {
  doc: DriveDocument;
  selected: boolean;
  onToggle: () => void;
}) {
  const isReady = doc.status === "ready";
  const canChat = canChatWithDocument(doc);

  return (
    <button
      type="button"
      disabled={!canChat}
      onClick={onToggle}
      className={cn(
        "brutal-card focus-brutal relative flex flex-col gap-2 p-3 text-left transition-all",
        !canChat && "cursor-not-allowed opacity-50",
        selected && "ring-2 ring-brutal-primary ring-offset-2",
        canChat && !selected && "brutal-card-hover",
      )}
      title={
        !canChat
          ? "Tài liệu chưa index AI — chỉ chọn tệp Sẵn sàng hoặc đang xử lý đã có nội dung"
          : !isReady
            ? "Tài liệu đang xử lý — câu trả lời có thể chưa đầy đủ"
            : undefined
      }
    >
      {selected && (
        <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border-2 border-brutal-ink bg-brutal-primary text-white shadow-brutal-sm">
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        </span>
      )}
      <div
        className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-brutal-ink shadow-brutal-sm"
        style={{ backgroundColor: fileIconBg(doc.mimeType) }}
        aria-hidden="true"
      >
        <FileIcon mimeType={doc.mimeType} />
      </div>
      <p className="truncate text-sm font-bold text-brutal-ink">{doc.title}</p>
      <StatusBadge status={doc.status} />
    </button>
  );
}

function AllDocumentsTile({
  selected,
  onSelect,
}: {
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "brutal-card focus-brutal col-span-full flex items-center gap-3 p-3 text-left transition-all",
        selected && "ring-2 ring-brutal-primary ring-offset-2 bg-brutal-primary/10",
      )}
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-brutal-ink bg-brutal-bg shadow-brutal-sm">
        <Globe className="h-6 w-6 text-brutal-secondary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-brutal-ink">Toàn bộ tài liệu</p>
        <p className="text-xs text-brutal-muted">
          Chat với tất cả tài liệu bạn có quyền truy cập
        </p>
      </div>
      {selected && (
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-brutal-ink bg-brutal-primary text-white">
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        </span>
      )}
    </button>
  );
}

function selectionCount(selection: Selection | null): number {
  if (!selection) return 0;
  if (selection.kind === "all") return 1;
  if (selection.kind === "folder") return 1;
  return selection.documents.length;
}

function buildCreateBody(selection: Selection): CreateSessionBody | null {
  if (selection.kind === "all") return { contextType: "all" };
  if (selection.kind === "folder") {
    return { contextType: "folder", contextId: selection.folder.id };
  }
  if (selection.documents.length === 0) return null;
  if (selection.documents.length === 1) {
    return {
      contextType: "document",
      contextId: selection.documents[0]!.id,
    };
  }
  return {
    contextType: "documents",
    contextIds: selection.documents.map((d) => d.id),
  };
}

export function ChatSourcePickerModal({
  open,
  onClose,
  onSessionCreated,
}: ChatSourcePickerModalProps) {
  const [step, setStep] = useState<PickerStep>("browse");
  const [browseFolderId, setBrowseFolderId] = useState<string | undefined>(
    undefined,
  );
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
    { id: undefined, name: "Drive của tôi" },
  ]);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: driveContents, isLoading } = useDriveContents(browseFolderId);
  const createSession = useCreateSession();

  const currentFolder = useMemo(() => {
    if (!browseFolderId) return null;
    return breadcrumbs[breadcrumbs.length - 1] ?? null;
  }, [browseFolderId, breadcrumbs]);

  const selectedDocIds = useMemo(() => {
    if (selection?.kind === "documents") {
      return new Set(selection.documents.map((d) => d.id));
    }
    return new Set<string>();
  }, [selection]);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !createSession.isPending) onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose, createSession.isPending]);

  function resetState() {
    setStep("browse");
    setBrowseFolderId(undefined);
    setBreadcrumbs([{ id: undefined, name: "Drive của tôi" }]);
    setSelection(null);
    setError(null);
  }

  function handleClose() {
    if (createSession.isPending) return;
    resetState();
    onClose();
  }

  function openFolder(folder: DriveFolder) {
    setBrowseFolderId(folder.id);
    setBreadcrumbs((prev) => [
      ...prev,
      { id: folder.id, name: folder.name, folder },
    ]);
  }

  function navigateBreadcrumb(index: number) {
    const item = breadcrumbs[index];
    if (!item) return;
    setBrowseFolderId(item.id);
    setBreadcrumbs((prev) => prev.slice(0, index + 1));
  }

  function selectAllDocuments() {
    const chattable = (driveContents?.documents ?? []).filter(canChatWithDocument);
    if (chattable.length === 0) return;
    setSelection({ kind: "documents", documents: chattable });
  }

  function clearSelection() {
    setSelection(null);
  }

  function toggleDocument(doc: DriveDocument) {
    if (!canChatWithDocument(doc)) return;
    setSelection((prev) => {
      if (prev?.kind === "documents") {
        const exists = prev.documents.some((d) => d.id === doc.id);
        const next = exists
          ? prev.documents.filter((d) => d.id !== doc.id)
          : [...prev.documents, doc];
        return next.length > 0 ? { kind: "documents", documents: next } : null;
      }
      return { kind: "documents", documents: [doc] };
    });
  }

  function selectCurrentFolder() {
    if (!browseFolderId || !currentFolder) return;
    const folder =
      currentFolder.folder ??
      ({
        id: browseFolderId,
        name: currentFolder.name,
        color: null,
        parentId:
          breadcrumbs.length > 2
            ? (breadcrumbs[breadcrumbs.length - 2]?.id ?? null)
            : null,
        isStarred: false,
        createdAt: "",
        updatedAt: "",
      } satisfies DriveFolder);
    setSelection({ kind: "folder", folder });
  }

  function removeReviewItem(item: Selection) {
    if (item.kind === "all") setSelection(null);
    else if (item.kind === "folder") setSelection(null);
    else if (item.kind === "documents") {
      setSelection((prev) => {
        if (prev?.kind !== "documents") return prev;
        return null;
      });
    }
  }

  function removeDocumentFromSelection(docId: string) {
    setSelection((prev) => {
      if (prev?.kind !== "documents") return prev;
      const next = prev.documents.filter((d) => d.id !== docId);
      return next.length > 0 ? { kind: "documents", documents: next } : null;
    });
  }

  async function handleCreate() {
    if (!selection) return;
    setError(null);
    const body = buildCreateBody(selection);
    if (!body) return;

    try {
      const session = await createSession.mutateAsync(body);
      resetState();
      onSessionCreated(session.id);
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  if (!open) return null;

  const count = selectionCount(selection);
  const canReview = count > 0;

  return (
    <div
      className="fixed inset-0 flex items-end justify-center p-0 sm:items-center sm:p-4"
      style={{
        zIndex: "var(--z-modal-overlay)",
        backgroundColor: "rgba(26,26,26,0.5)",
        backdropFilter: "blur(2px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !createSession.isPending) handleClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="chat-source-picker-title"
    >
      <BrutalCard
        className="flex max-h-[92vh] w-full flex-col overflow-hidden sm:max-h-[85vh] sm:max-w-4xl"
        style={{ zIndex: "var(--z-modal)" }}
      >
        <div className="flex shrink-0 items-center justify-between border-b-2 border-brutal-ink px-4 py-3">
          <h2
            id="chat-source-picker-title"
            className="font-heading text-lg font-extrabold sm:text-xl"
          >
            {step === "browse" ? "Chọn nguồn tài liệu" : "Xem lại đã chọn"}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            disabled={createSession.isPending}
            className="focus-brutal flex h-8 w-8 items-center justify-center rounded-lg border-2 border-brutal-ink hover:bg-brutal-bg disabled:opacity-50"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {step === "browse" ? (
          <>
            <div className="shrink-0 space-y-2 border-b-2 border-brutal-ink/20 px-4 py-3">
              <nav className="flex flex-wrap items-center gap-1 text-sm" aria-label="Breadcrumb">
                {breadcrumbs.map((crumb, index) => (
                  <span key={`${crumb.id ?? "root"}-${index}`} className="flex items-center gap-1">
                    {index > 0 && (
                      <ChevronRight className="h-3.5 w-3.5 text-brutal-muted" aria-hidden />
                    )}
                    <button
                      type="button"
                      onClick={() => navigateBreadcrumb(index)}
                      className={cn(
                        "focus-brutal rounded-lg px-1.5 py-0.5 font-semibold",
                        index === breadcrumbs.length - 1
                          ? "text-brutal-ink"
                          : "text-brutal-secondary hover:underline",
                      )}
                    >
                      {crumb.name}
                    </button>
                  </span>
                ))}
              </nav>

              <div className="flex flex-wrap gap-2">
                {browseFolderId && currentFolder && (
                  <button
                    type="button"
                    onClick={selectCurrentFolder}
                    className={cn(
                      "focus-brutal rounded-lg border-2 border-brutal-ink px-3 py-1.5 text-xs font-bold transition-colors",
                      selection?.kind === "folder" &&
                        selection.folder.id === browseFolderId
                        ? "bg-brutal-primary text-white"
                        : "bg-brutal-surface hover:bg-brutal-bg",
                    )}
                  >
                    Chọn thư mục này
                  </button>
                )}
                <button
                  type="button"
                  onClick={selectAllDocuments}
                  className="focus-brutal rounded-lg border-2 border-brutal-ink bg-brutal-surface px-3 py-1.5 text-xs font-bold hover:bg-brutal-bg"
                >
                  Chọn tất cả
                </button>
                <button
                  type="button"
                  onClick={clearSelection}
                  disabled={count === 0}
                  className="focus-brutal rounded-lg border-2 border-brutal-ink bg-brutal-surface px-3 py-1.5 text-xs font-bold hover:bg-brutal-bg disabled:opacity-50"
                >
                  Xóa tất cả
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {isLoading ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="skeleton h-28 rounded-2xl" />
                  ))}
                </div>
              ) : (
                <FileGrid>
                  <AllDocumentsTile
                    selected={selection?.kind === "all"}
                    onSelect={() => setSelection({ kind: "all" })}
                  />
                  {driveContents?.folders.map((folder) => (
                    <PickerFolderTile
                      key={folder.id}
                      folder={folder}
                      onOpen={() => openFolder(folder)}
                    />
                  ))}
                  {driveContents?.documents.map((doc) => (
                    <PickerDocumentTile
                      key={doc.id}
                      doc={doc}
                      selected={selectedDocIds.has(doc.id)}
                      onToggle={() => toggleDocument(doc)}
                    />
                  ))}
                </FileGrid>
              )}
            </div>

            <div className="flex shrink-0 items-center justify-between gap-2 border-t-2 border-brutal-ink px-4 py-3">
              <p className="text-sm font-semibold text-brutal-muted">
                Đã chọn: {count}
              </p>
              <BrutalButton
                variant="primary"
                className="!w-auto shrink-0"
                disabled={!canReview}
                onClick={() => setStep("review")}
              >
                Xem lại
              </BrutalButton>
            </div>
          </>
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {!selection ? (
                <p className="text-sm text-brutal-muted">Chưa chọn nguồn nào.</p>
              ) : selection.kind === "all" ? (
                <ul className="space-y-2">
                  <li className="flex items-center justify-between gap-2 rounded-xl border-2 border-brutal-ink bg-brutal-bg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Globe className="h-5 w-5 text-brutal-secondary" />
                      <span className="font-bold">Toàn bộ tài liệu</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeReviewItem(selection)}
                      className="focus-brutal rounded-lg p-1 hover:bg-brutal-surface"
                      aria-label="Xóa"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                </ul>
              ) : selection.kind === "folder" ? (
                <ul className="space-y-2">
                  <li className="flex items-center justify-between gap-2 rounded-xl border-2 border-brutal-ink bg-brutal-bg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Folder className="h-5 w-5 text-brutal-primary" />
                      <span className="font-bold">{selection.folder.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeReviewItem(selection)}
                      className="focus-brutal rounded-lg p-1 hover:bg-brutal-surface"
                      aria-label="Xóa"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                </ul>
              ) : (
                <ul className="space-y-2">
                  {selection.documents.map((doc) => (
                    <li
                      key={doc.id}
                      className="flex items-center justify-between gap-2 rounded-xl border-2 border-brutal-ink bg-brutal-bg px-3 py-2"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <FileText className="h-5 w-5 shrink-0 text-brutal-secondary" />
                        <span className="truncate font-bold">{doc.title}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeDocumentFromSelection(doc.id)}
                        className="focus-brutal shrink-0 rounded-lg p-1 hover:bg-brutal-surface"
                        aria-label={`Xóa ${doc.title}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {error && (
                <div className="mt-3">
                  <ErrorAlert message={error} variant="inline" />
                </div>
              )}
            </div>

            <div className="flex shrink-0 flex-wrap gap-2 border-t-2 border-brutal-ink px-4 py-3">
              <BrutalButton
                variant="ghost"
                className="flex-1 sm:flex-none"
                onClick={() => setStep("browse")}
                disabled={createSession.isPending}
              >
                Quay lại
              </BrutalButton>
              <BrutalButton
                variant="ghost"
                className="flex-1 sm:flex-none"
                onClick={clearSelection}
                disabled={createSession.isPending || count === 0}
              >
                Xóa tất cả
              </BrutalButton>
              <BrutalButton
                variant="primary"
                className="flex-1 sm:flex-none"
                loading={createSession.isPending}
                disabled={!canReview || createSession.isPending}
                onClick={() => void handleCreate()}
              >
                Bắt đầu trò chuyện
              </BrutalButton>
            </div>
          </>
        )}
      </BrutalCard>
    </div>
  );
}
