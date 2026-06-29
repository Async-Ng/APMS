"use client";

import { Star } from "lucide-react";
import { useState } from "react";

import { DocumentCard } from "@/components/app/DocumentCard";
import { FileGrid } from "@/components/app/FileGrid";
import { FolderCard } from "@/components/app/FolderCard";
import { FolderModal } from "@/components/app/FolderModal";
import { Topbar } from "@/components/app/Topbar";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { SkeletonGrid } from "@/components/ui/SkeletonCard";
import type { DriveDocument, DriveFolder } from "@/lib/queries/drive";
import { useStarred } from "@/lib/queries/drive";

export default function StarredPage() {
  const { data, isLoading, isError, refetch } = useStarred();
  const [renameFolder, setRenameFolder] = useState<DriveFolder | null>(null);
  const [renameDoc, setRenameDoc] = useState<DriveDocument | null>(null);

  const isEmpty =
    !isLoading && data?.folders.length === 0 && data?.documents.length === 0;

  return (
    <>
      <Topbar breadcrumbs={[{ label: "Đã gắn sao" }]} />

      <main className="flex-1 p-4 sm:p-6" id="main-content">
        {isError && (
          <ErrorAlert
            className="mb-4"
            message="Không tải được mục đã gắn sao. Kiểm tra mạng và thử lại."
            actionLabel="Thử lại"
            onAction={() => void refetch()}
          />
        )}

        {isLoading ? (
          <FileGrid>
            <SkeletonGrid count={6} />
          </FileGrid>
        ) : isEmpty ? (
          <EmptyState
            icon={<Star className="h-12 w-12 text-brutal-primary" strokeWidth={1.5} />}
            title="Chưa có mục gắn sao"
            description="Gắn sao thư mục và tệp để mở nhanh khi ôn thi hoặc làm bài tập."
          />
        ) : (
          <div className="space-y-6">
            {(data?.folders.length ?? 0) > 0 && (
              <section aria-labelledby="starred-folders-heading">
                <h2
                  id="starred-folders-heading"
                  className="mb-3 font-heading text-sm font-bold uppercase tracking-widest text-brutal-muted"
                >
                  Thư mục đã gắn sao
                </h2>
                <FileGrid>
                  {data?.folders.map((folder) => (
                    <FolderCard
                      key={folder.id}
                      folder={folder}
                      onRename={setRenameFolder}
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
                  Tệp đã gắn sao
                </h2>
                <FileGrid>
                  {data?.documents.map((doc) => (
                    <DocumentCard
                      key={doc.id}
                      document={doc}
                      onRename={setRenameDoc}
                    />
                  ))}
                </FileGrid>
              </section>
            )}
          </div>
        )}
      </main>

      {renameFolder && (
        <FolderModal
          parentId={null}
          folder={renameFolder}
          onClose={() => setRenameFolder(null)}
        />
      )}

      {renameDoc && (
        <FolderModal
          parentId={null}
          documentToRename={renameDoc}
          onClose={() => setRenameDoc(null)}
        />
      )}
    </>
  );
}
