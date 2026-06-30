"use client";

import { Trash2, Undo2 } from "lucide-react";
import { useState } from "react";

import { FileGrid } from "@/components/app/FileGrid";
import { Topbar } from "@/components/app/Topbar";
import { BrutalButton } from "@/components/ui/BrutalButton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { SkeletonGrid } from "@/components/ui/SkeletonCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatTrashPurgeLabel } from "@/lib/format";
import { getUserErrorMessage } from "@/lib/errors";
import type { DriveDocument, DriveFolder } from "@/lib/queries/drive";
import {
  usePermanentDeleteFolder,
  useRestoreFolder,
  useTrash,
} from "@/lib/queries/drive";
import {
  usePermanentDeleteDocument,
  useRestoreDocument,
} from "@/lib/queries/documents";

type DeleteTarget =
  | { kind: "folder"; item: DriveFolder }
  | { kind: "document"; item: DriveDocument };

function TrashFolderCard({
  folder,
  onDeletePermanently,
}: {
  folder: DriveFolder;
  onDeletePermanently: (folder: DriveFolder) => void;
}) {
  const { mutate: restore, isPending: isRestoring } = useRestoreFolder();

  return (
    <div className="brutal-card flex flex-col gap-2 p-3 opacity-80">
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={() => onDeletePermanently(folder)}
          disabled={isRestoring}
          className="focus-brutal flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-brutal-ink bg-brutal-bg shadow-brutal-sm transition-colors hover:bg-red-50 disabled:opacity-50"
          aria-label={`Xóa vĩnh viễn thư mục ${folder.name}`}
        >
          <Trash2 className="h-6 w-6 text-brutal-danger" strokeWidth={1.5} />
        </button>

        <BrutalButton
          variant="ghost"
          onClick={() => restore(folder.id)}
          disabled={isRestoring}
          className="relative z-10 px-2 py-1 text-xs"
          aria-label={`Khôi phục thư mục ${folder.name}`}
        >
          <Undo2 className="h-3.5 w-3.5" />
          Khôi phục
        </BrutalButton>
      </div>

      <p className="truncate text-sm font-bold text-brutal-ink">{folder.name}</p>
      <p className="text-xs text-brutal-muted">Thư mục</p>
      <p className="text-xs text-brutal-muted">{formatTrashPurgeLabel(folder)}</p>
    </div>
  );
}

function TrashDocumentCard({
  doc,
  onDeletePermanently,
}: {
  doc: DriveDocument;
  onDeletePermanently: (doc: DriveDocument) => void;
}) {
  const { mutate: restore, isPending: isRestoring } = useRestoreDocument();

  return (
    <div className="brutal-card flex flex-col gap-2 p-3 opacity-80">
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={() => onDeletePermanently(doc)}
          disabled={isRestoring}
          className="focus-brutal flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-brutal-ink bg-brutal-bg shadow-brutal-sm transition-colors hover:bg-red-50 disabled:opacity-50"
          aria-label={`Xóa vĩnh viễn tệp ${doc.title}`}
        >
          <Trash2 className="h-6 w-6 text-brutal-danger" strokeWidth={1.5} />
        </button>

        <BrutalButton
          variant="ghost"
          onClick={() => restore(doc.id)}
          disabled={isRestoring}
          className="relative z-10 px-2 py-1 text-xs"
          aria-label={`Khôi phục tệp ${doc.title}`}
        >
          <Undo2 className="h-3.5 w-3.5" />
          Khôi phục
        </BrutalButton>
      </div>

      <p className="truncate text-sm font-bold text-brutal-ink">{doc.title}</p>
      <StatusBadge status={doc.status} />
      <p className="text-xs text-brutal-muted">{formatTrashPurgeLabel(doc)}</p>
    </div>
  );
}

export default function TrashPage() {
  const { data, isLoading, isError } = useTrash();
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { mutate: deleteFolder, isPending: isDeletingFolder } =
    usePermanentDeleteFolder();
  const { mutate: deleteDocument, isPending: isDeletingDocument } =
    usePermanentDeleteDocument();

  const isDeleting = isDeletingFolder || isDeletingDocument;
  const isEmpty =
    !isLoading && data?.folders.length === 0 && data?.documents.length === 0;

  function handleDeletePermanently(target: DeleteTarget) {
    setDeleteError(null);
    setDeleteTarget(target);
  }

  function confirmPermanentDelete() {
    if (!deleteTarget) return;

    const onError = (err: unknown) => {
      setDeleteError(getUserErrorMessage(err));
    };

    const onSuccess = () => {
      setDeleteTarget(null);
      setDeleteError(null);
    };

    if (deleteTarget.kind === "folder") {
      deleteFolder(deleteTarget.item.id, { onSuccess, onError });
      return;
    }

    deleteDocument(deleteTarget.item.id, { onSuccess, onError });
  }

  const deleteDialogTitle =
    deleteTarget?.kind === "folder"
      ? "Xóa thư mục vĩnh viễn?"
      : "Xóa tệp vĩnh viễn?";

  const deleteDialogDescription =
    deleteTarget?.kind === "folder" ? (
      <>
        Bạn sắp xóa vĩnh viễn{" "}
        <span className="font-bold text-brutal-ink">
          &ldquo;{deleteTarget.item.name}&rdquo;
        </span>
        . Mọi mục trong thùng rác thuộc cây thư mục này cũng sẽ bị xóa. Hành động
        này không thể hoàn tác.
      </>
    ) : deleteTarget?.kind === "document" ? (
      <>
        Bạn sắp xóa vĩnh viễn{" "}
        <span className="font-bold text-brutal-ink">
          &ldquo;{deleteTarget.item.title}&rdquo;
        </span>
        . Hành động này không thể hoàn tác.
      </>
    ) : null;

  return (
    <>
      <ConfirmDialog
        open={deleteTarget !== null}
        title={deleteDialogTitle}
        description={deleteDialogDescription}
        confirmLabel="Xóa vĩnh viễn"
        cancelLabel="Huỷ"
        tone="danger"
        isPending={isDeleting}
        onClose={() => {
          if (!isDeleting) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
        onConfirm={confirmPermanentDelete}
      />

      <Topbar breadcrumbs={[{ label: "Thùng rác" }]} />

      <main className="flex-1 p-4 sm:p-6" id="main-content">
        <div className="mb-6 flex items-center gap-3 rounded-xl border-2 border-brutal-ink bg-brutal-bg px-4 py-3 text-sm text-brutal-muted shadow-brutal-sm">
          <Trash2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          Bấm icon thùng rác để xóa vĩnh viễn, hoặc Khôi phục để lấy lại mục. Mục
          trong thùng rác tự xóa sau 30 ngày.
        </div>

        {deleteError && (
          <ErrorAlert
            className="mb-4"
            message={deleteError}
            actionLabel="Đóng"
            onAction={() => setDeleteError(null)}
          />
        )}

        {isError && (
          <ErrorAlert
            className="mb-4"
            message="Không tải được thùng rác. Vui lòng thử lại."
            actionLabel="Tải lại"
            onAction={() => window.location.reload()}
          />
        )}

        {isLoading ? (
          <FileGrid>
            <SkeletonGrid count={6} />
          </FileGrid>
        ) : isEmpty ? (
          <EmptyState
            icon={<Trash2 className="h-12 w-12 text-brutal-muted" strokeWidth={1.5} />}
            title="Thùng rác trống"
            description="Tệp và thư mục đã xóa sẽ xuất hiện tại đây."
          />
        ) : (
          <div className="space-y-6">
            {(data?.folders.length ?? 0) > 0 && (
              <section aria-labelledby="trash-folders-heading">
                <h2
                  id="trash-folders-heading"
                  className="mb-3 font-heading text-sm font-bold uppercase tracking-widest text-brutal-muted"
                >
                  Thư mục
                </h2>
                <FileGrid>
                  {data?.folders.map((folder) => (
                    <TrashFolderCard
                      key={folder.id}
                      folder={folder}
                      onDeletePermanently={(item) =>
                        handleDeletePermanently({ kind: "folder", item })
                      }
                    />
                  ))}
                </FileGrid>
              </section>
            )}

            {(data?.documents.length ?? 0) > 0 && (
              <section aria-labelledby="trash-docs-heading">
                <h2
                  id="trash-docs-heading"
                  className="mb-3 font-heading text-sm font-bold uppercase tracking-widest text-brutal-muted"
                >
                  Tệp
                </h2>
                <FileGrid>
                  {data?.documents.map((doc) => (
                    <TrashDocumentCard
                      key={doc.id}
                      doc={doc}
                      onDeletePermanently={(item) =>
                        handleDeletePermanently({ kind: "document", item })
                      }
                    />
                  ))}
                </FileGrid>
              </section>
            )}
          </div>
        )}
      </main>
    </>
  );
}
