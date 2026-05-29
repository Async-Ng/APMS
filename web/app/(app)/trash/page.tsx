"use client";

import { Trash2, Undo2 } from "lucide-react";

import { FileGrid } from "@/components/app/FileGrid";
import { Topbar } from "@/components/app/Topbar";
import { BrutalButton } from "@/components/ui/BrutalButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonGrid } from "@/components/ui/SkeletonCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { DriveDocument, DriveFolder } from "@/lib/queries/drive";
import { useTrash } from "@/lib/queries/drive";
import { useRestoreDocument } from "@/lib/queries/documents";
import { useRestoreFolder } from "@/lib/queries/drive";

/* ── Trash item card ────────────────────────────────────────── */

function TrashFolderCard({
  folder,
}: {
  folder: DriveFolder;
}) {
  const { mutate: restore, isPending } = useRestoreFolder();

  return (
    <div className="brutal-card flex flex-col gap-2 p-3 opacity-80">
      <div className="flex items-start justify-between">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-brutal-ink bg-brutal-bg shadow-brutal-sm"
          aria-hidden="true"
        >
          <Trash2 className="h-6 w-6 text-brutal-muted" strokeWidth={1.5} />
        </div>

        <BrutalButton
          variant="ghost"
          onClick={() => restore(folder.id)}
          disabled={isPending}
          className="relative z-10 px-2 py-1 text-xs"
          aria-label={`Restore folder ${folder.name}`}
        >
          <Undo2 className="h-3.5 w-3.5" />
          Restore
        </BrutalButton>
      </div>

      <p className="truncate text-sm font-bold text-brutal-ink">{folder.name}</p>
      <p className="text-xs text-brutal-muted">Folder</p>
    </div>
  );
}

function TrashDocumentCard({ doc }: { doc: DriveDocument }) {
  const { mutate: restore, isPending } = useRestoreDocument();

  return (
    <div className="brutal-card flex flex-col gap-2 p-3 opacity-80">
      <div className="flex items-start justify-between">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-brutal-ink bg-brutal-bg shadow-brutal-sm"
          aria-hidden="true"
        >
          <Trash2 className="h-6 w-6 text-brutal-muted" strokeWidth={1.5} />
        </div>

        <BrutalButton
          variant="ghost"
          onClick={() => restore(doc.id)}
          disabled={isPending}
          className="relative z-10 px-2 py-1 text-xs"
          aria-label={`Restore file ${doc.title}`}
        >
          <Undo2 className="h-3.5 w-3.5" />
          Restore
        </BrutalButton>
      </div>

      <p className="truncate text-sm font-bold text-brutal-ink">{doc.title}</p>
      <StatusBadge status={doc.status} />
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────── */

export default function TrashPage() {
  const { data, isLoading, isError } = useTrash();
  const isEmpty =
    !isLoading && data?.folders.length === 0 && data?.documents.length === 0;

  return (
    <>
      <Topbar
        breadcrumbs={[{ label: "Trash" }]}
        onMenuOpen={() => {}}
        isCollapsed={false}
      />

      <main className="flex-1 p-4 sm:p-6" id="main-content">
        {/* Info banner */}
        <div className="mb-6 flex items-center gap-3 rounded-xl border-2 border-brutal-ink bg-brutal-bg px-4 py-3 text-sm text-brutal-muted shadow-brutal-sm">
          <Trash2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          Items in Trash can be restored. Permanent deletion is not yet available.
        </div>

        {isError && (
          <p className="mb-4 rounded-xl border-2 border-brutal-ink bg-red-50 px-4 py-3 text-sm font-medium text-brutal-danger">
            Failed to load Trash. Please refresh.
          </p>
        )}

        {isLoading ? (
          <FileGrid>
            <SkeletonGrid count={6} />
          </FileGrid>
        ) : isEmpty ? (
          <EmptyState
            icon={<Trash2 className="h-12 w-12 text-brutal-muted" strokeWidth={1.5} />}
            title="Trash is empty"
            description="Deleted files and folders will appear here."
          />
        ) : (
          <div className="space-y-6">
            {(data?.folders.length ?? 0) > 0 && (
              <section aria-labelledby="trash-folders-heading">
                <h2
                  id="trash-folders-heading"
                  className="mb-3 font-heading text-sm font-bold uppercase tracking-widest text-brutal-muted"
                >
                  Folders
                </h2>
                <FileGrid>
                  {data?.folders.map((folder) => (
                    <TrashFolderCard key={folder.id} folder={folder} />
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
                  Files
                </h2>
                <FileGrid>
                  {data?.documents.map((doc) => (
                    <TrashDocumentCard key={doc.id} doc={doc} />
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
