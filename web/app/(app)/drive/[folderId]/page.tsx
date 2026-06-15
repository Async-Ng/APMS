"use client";

import { FolderPlus } from "lucide-react";
import { use, useState } from "react";

import { AskAiLink } from "@/components/app/AskAiLink";
import { DocumentCard } from "@/components/app/DocumentCard";
import { FileGrid } from "@/components/app/FileGrid";
import { FolderCard } from "@/components/app/FolderCard";
import { FolderModal } from "@/components/app/FolderModal";
import { ShareModal } from "@/components/app/ShareModal";
import { Topbar } from "@/components/app/Topbar";
import { UploadModal } from "@/components/app/UploadModal";
import { BrutalButton } from "@/components/ui/BrutalButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { SkeletonGrid } from "@/components/ui/SkeletonCard";
import type { DriveDocument, DriveFolder } from "@/lib/queries/drive";
import { useDriveContents } from "@/lib/queries/drive";

interface PageProps {
  params: Promise<{ folderId: string }>;
}

export default function FolderPage({ params }: PageProps) {
  const { folderId } = use(params);
  const { data, isLoading, isError } = useDriveContents(folderId);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [renameFolder, setRenameFolder] = useState<DriveFolder | null>(null);
  const [renameDoc, setRenameDoc] = useState<DriveDocument | null>(null);
  const [shareTarget, setShareTarget] = useState<{
    resourceType: "folder" | "document";
    resourceId: string;
    resourceName: string;
  } | null>(null);

  const isEmpty =
    !isLoading && data?.folders.length === 0 && data?.documents.length === 0;

  // Build breadcrumb — in a real app you'd fetch the full path from the folder detail
  const breadcrumbs = [
    { label: "Drive của tôi", href: "/drive" },
    { label: isLoading ? "…" : (data?.folders[0]?.name ?? "Thư mục") },
  ];

  return (
    <>
      <Topbar
        breadcrumbs={breadcrumbs}
        onMenuOpen={() => {}}
        onUploadClick={() => setUploadOpen(true)}
        actions={
          <>
            <AskAiLink
              id={`folder-${folderId}-ask-ai-btn`}
              href={`/chat?contextType=folder&contextId=${folderId}`}
            />
            <BrutalButton
              id={`folder-${folderId}-new-folder-btn`}
              variant="ghost"
              onClick={() => setFolderModalOpen(true)}
              className="hidden !w-auto shrink-0 whitespace-nowrap sm:inline-flex"
            >
              <FolderPlus className="h-4 w-4" aria-hidden="true" />
              Thư mục mới
            </BrutalButton>
          </>
        }
      />

      <main className="flex-1 p-4 sm:p-6" id="main-content">
        {isError && (
          <ErrorAlert
            className="mb-4"
            message="Không tải được thư mục. Vui lòng thử lại."
            actionLabel="Tải lại"
            onAction={() => window.location.reload()}
          />
        )}

        {isLoading ? (
          <FileGrid>
            <SkeletonGrid count={8} />
          </FileGrid>
        ) : isEmpty ? (
          <EmptyState
            title="Thư mục trống"
            description="Tải lên tệp hoặc tạo thư mục con để bắt đầu."
            action={
              <BrutalButton variant="primary" onClick={() => setUploadOpen(true)}>
                Tải lên tệp
              </BrutalButton>
            }
          />
        ) : (
          <div className="space-y-6">
            {(data?.folders.length ?? 0) > 0 && (
              <section aria-labelledby={`folders-heading-${folderId}`}>
                <h2
                  id={`folders-heading-${folderId}`}
                  className="mb-3 font-heading text-sm font-bold uppercase tracking-widest text-brutal-muted"
                >
                  Thư mục
                </h2>
                <FileGrid>
                  {data?.folders.map((folder) => (
                    <FolderCard
                      key={folder.id}
                      folder={folder}
                      parentId={folderId}
                      onRename={setRenameFolder}
                      onShare={(f) =>
                        setShareTarget({
                          resourceType: "folder",
                          resourceId: f.id,
                          resourceName: f.name,
                        })
                      }
                    />
                  ))}
                </FileGrid>
              </section>
            )}

            {(data?.documents.length ?? 0) > 0 && (
              <section aria-labelledby={`docs-heading-${folderId}`}>
                <h2
                  id={`docs-heading-${folderId}`}
                  className="mb-3 font-heading text-sm font-bold uppercase tracking-widest text-brutal-muted"
                >
                  Tệp
                </h2>
                <FileGrid>
                  {data?.documents.map((doc) => (
                    <DocumentCard
                      key={doc.id}
                      document={doc}
                      parentId={folderId}
                      onRename={setRenameDoc}
                      onShare={(d) =>
                        setShareTarget({
                          resourceType: "document",
                          resourceId: d.id,
                          resourceName: d.title,
                        })
                      }
                    />
                  ))}
                </FileGrid>
              </section>
            )}
          </div>
        )}
      </main>

      {uploadOpen && (
        <UploadModal folderId={folderId} onClose={() => setUploadOpen(false)} />
      )}

      {(folderModalOpen || renameFolder) && (
        <FolderModal
          parentId={folderId}
          folder={renameFolder ?? undefined}
          onClose={() => {
            setFolderModalOpen(false);
            setRenameFolder(null);
          }}
        />
      )}

      {renameDoc && (
        <FolderModal
          parentId={folderId}
          documentToRename={renameDoc}
          onClose={() => setRenameDoc(null)}
        />
      )}

      {shareTarget && (
        <ShareModal
          resourceType={shareTarget.resourceType}
          resourceId={shareTarget.resourceId}
          resourceName={shareTarget.resourceName}
          onClose={() => setShareTarget(null)}
        />
      )}
    </>
  );
}
