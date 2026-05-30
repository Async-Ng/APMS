"use client";

import { Star } from "lucide-react";

import { DocumentCard } from "@/components/app/DocumentCard";
import { FileGrid } from "@/components/app/FileGrid";
import { FolderCard } from "@/components/app/FolderCard";
import { Topbar } from "@/components/app/Topbar";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonGrid } from "@/components/ui/SkeletonCard";
import { useStarred } from "@/lib/queries/drive";

export default function StarredPage() {
  const { data, isLoading, isError } = useStarred();
  const isEmpty =
    !isLoading && data?.folders.length === 0 && data?.documents.length === 0;

  return (
    <>
      <Topbar
        breadcrumbs={[{ label: "Starred" }]}
        onMenuOpen={() => {}}
      />

      <main className="flex-1 p-4 sm:p-6" id="main-content">
        {isError && (
          <p className="rounded-xl border-2 border-brutal-ink bg-red-50 px-4 py-3 text-sm font-medium text-brutal-danger">
            Failed to load starred items.
          </p>
        )}

        {isLoading ? (
          <FileGrid>
            <SkeletonGrid count={6} />
          </FileGrid>
        ) : isEmpty ? (
          <EmptyState
            icon={<Star className="h-12 w-12 text-brutal-primary" strokeWidth={1.5} />}
            title="No starred items"
            description="Star folders and files for quick access. They'll appear here."
          />
        ) : (
          <div className="space-y-6">
            {(data?.folders.length ?? 0) > 0 && (
              <section aria-labelledby="starred-folders-heading">
                <h2
                  id="starred-folders-heading"
                  className="mb-3 font-heading text-sm font-bold uppercase tracking-widest text-brutal-muted"
                >
                  Starred Folders
                </h2>
                <FileGrid>
                  {data?.folders.map((folder) => (
                    <FolderCard
                      key={folder.id}
                      folder={folder}
                      onRename={() => {}}
                    />
                  ))}
                </FileGrid>
              </section>
            )}

            {(data?.documents.length ?? 0) > 0 && (
              <section aria-labelledby="starred-docs-heading">
                <h2
                  id="starred-docs-heading"
                  className="mb-3 font-heading text-sm font-bold uppercase tracking-widest text-brutal-muted"
                >
                  Starred Files
                </h2>
                <FileGrid>
                  {data?.documents.map((doc) => (
                    <DocumentCard
                      key={doc.id}
                      document={doc}
                      onRename={() => {}}
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
