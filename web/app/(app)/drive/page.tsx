"use client";

import { FolderPlus } from "lucide-react";
import { useState } from "react";

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

export default function DrivePage() {
  const { data, isLoading, isError } = useDriveContents();
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

  return (
    <>
      <Topbar
        breadcrumbs={[{ label: "My Drive" }]}
        onMenuOpen={() => {}} // hoisted to layout via context in real app; noop here
        onUploadClick={() => setUploadOpen(true)}
        actions={
          <>
            <AskAiLink id="drive-ask-ai-btn" href="/chat" />
            <BrutalButton
              id="new-folder-btn"
              variant="ghost"
              onClick={() => setFolderModalOpen(true)}
              className="hidden !w-auto shrink-0 whitespace-nowrap sm:inline-flex"
            >
              <FolderPlus className="h-4 w-4" aria-hidden="true" />
              New Folder
            </BrutalButton>
          </>
        }
      />

      <main className="flex-1 p-4 sm:p-6" id="main-content">
        {isError && (
          <ErrorAlert
            className="mb-4"
            message="Không tải được tài liệu. Kiểm tra kết nối mạng và thử lại."
            actionLabel="Tải lại"
            onAction={() => window.location.reload()}
          />
        )}

        {isLoading ? (
          <FileGrid>
            <SkeletonGrid count={10} />
          </FileGrid>
        ) : isEmpty ? (
          <EmptyState
            title="Your Drive is empty"
            description="Upload a PDF, DOCX, or PPTX file to get started, or create a folder to organise your materials."
            action={
              <BrutalButton
                variant="primary"
                onClick={() => setUploadOpen(true)}
              >
                Upload your first file
              </BrutalButton>
            }
          />
        ) : (
          <div className="space-y-6">
            {/* Folders section */}
            {(data?.folders.length ?? 0) > 0 && (
              <section aria-labelledby="folders-heading">
                <h2
                  id="folders-heading"
                  className="mb-3 font-heading text-sm font-bold uppercase tracking-widest text-brutal-muted"
                >
                  Folders
                </h2>
                <FileGrid>
                  {data?.folders.map((folder) => (
                    <FolderCard
                      key={folder.id}
                      folder={folder}
                      parentId={undefined}
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

            {/* Documents section */}
            {(data?.documents.length ?? 0) > 0 && (
              <section aria-labelledby="docs-heading">
                <h2
                  id="docs-heading"
                  className="mb-3 font-heading text-sm font-bold uppercase tracking-widest text-brutal-muted"
                >
                  Files
                </h2>
                <FileGrid>
                  {data?.documents.map((doc) => (
                    <DocumentCard
                      key={doc.id}
                      document={doc}
                      parentId={undefined}
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

      {/* Modals */}
      {uploadOpen && (
        <UploadModal
          folderId={null}
          onClose={() => setUploadOpen(false)}
        />
      )}

      {(folderModalOpen || renameFolder) && (
        <FolderModal
          parentId={null}
          folder={renameFolder ?? undefined}
          onClose={() => {
            setFolderModalOpen(false);
            setRenameFolder(null);
          }}
        />
      )}

      {renameDoc && (
        <FolderModal
          parentId={null}
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
