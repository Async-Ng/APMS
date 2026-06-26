"use client";

import { FolderPlus } from "lucide-react";
import { useMemo, useState } from "react";

import { AskAiLink } from "@/components/app/AskAiLink";
import { DocumentCard } from "@/components/app/DocumentCard";
import { DriveAcademicBanner } from "@/components/app/drive/DriveAcademicBanner";
import { SubjectFolderCard } from "@/components/app/drive/SubjectFolderCard";
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
import {
  getEnrolledCourses,
  getOtherRootDocuments,
  groupRootDocumentsBySubject,
} from "@/lib/drive/academic-grouping";
import { useAcademicProfile, useCatalogCurriculum } from "@/lib/queries/catalog";
import type { DriveDocument, DriveFolder } from "@/lib/queries/drive";
import { useDriveContents } from "@/lib/queries/drive";

export default function DrivePage() {
  const { data, isLoading, isError } = useDriveContents();
  const { data: profile, isLoading: isProfileLoading } = useAcademicProfile();
  const { data: curriculum } = useCatalogCurriculum(
    profile?.major?.id,
    profile?.currentSemester ?? undefined,
  );

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadCourseId, setUploadCourseId] = useState<string | undefined>();
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [renameFolder, setRenameFolder] = useState<DriveFolder | null>(null);
  const [renameDoc, setRenameDoc] = useState<DriveDocument | null>(null);
  const [shareTarget, setShareTarget] = useState<{
    resourceType: "folder" | "document";
    resourceId: string;
    resourceName: string;
  } | null>(null);

  const profileComplete = Boolean(profile?.isComplete);
  const enrolledCourses = useMemo(
    () => getEnrolledCourses(profile, curriculum),
    [profile, curriculum],
  );
  const subjectGroups = useMemo(
    () => groupRootDocumentsBySubject(data?.documents ?? [], enrolledCourses),
    [data?.documents, enrolledCourses],
  );
  const documentCountByCourseId = useMemo(
    () => new Map(subjectGroups.map((g) => [g.curriculumCourseId, g.documents.length])),
    [subjectGroups],
  );
  const otherDocuments = useMemo(
    () =>
      getOtherRootDocuments(
        data?.documents ?? [],
        enrolledCourses,
        profile?.currentSemester,
      ),
    [data?.documents, enrolledCourses, profile?.currentSemester],
  );

  const folders = data?.folders ?? [];
  const documents = data?.documents ?? [];
  const showAcademicLayout =
    profileComplete && enrolledCourses.length > 0 && !isLoading;
  const hasUnifiedFolders =
    showAcademicLayout && (enrolledCourses.length > 0 || folders.length > 0);
  const isEmpty =
    !isLoading &&
    !showAcademicLayout &&
    folders.length === 0 &&
    documents.length === 0;

  function openUpload(curriculumCourseId?: string) {
    setUploadCourseId(curriculumCourseId);
    setUploadOpen(true);
  }

  function closeUpload() {
    setUploadOpen(false);
    setUploadCourseId(undefined);
  }

  function shareDocument(doc: DriveDocument) {
    setShareTarget({
      resourceType: "document",
      resourceId: doc.id,
      resourceName: doc.title,
    });
  }

  return (
    <>
      <Topbar
        breadcrumbs={[{ label: "Drive của tôi" }]}
        onMenuOpen={() => {}}
        onUploadClick={() => openUpload()}
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
              Thư mục mới
            </BrutalButton>
          </>
        }
      />

      <main className="flex-1 p-4 sm:p-6" id="main-content">
        <DriveAcademicBanner profile={profile} isLoading={isProfileLoading} />

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
            title="Drive trống"
            description="Tải lên tệp PDF, DOCX hoặc PPTX để bắt đầu, hoặc tạo thư mục để sắp xếp tài liệu."
            action={
              <BrutalButton variant="primary" onClick={() => openUpload()}>
                Tải lên tệp đầu tiên
              </BrutalButton>
            }
          />
        ) : showAcademicLayout ? (
          <div className="space-y-8">
            {hasUnifiedFolders && (
              <section aria-labelledby="folders-heading">
                <h2
                  id="folders-heading"
                  className="mb-3 font-heading text-sm font-bold uppercase tracking-widest text-brutal-muted"
                >
                  Thư mục
                </h2>
                <FileGrid>
                  {enrolledCourses.map((course) => {
                    if (!course.subject) return null;
                    return (
                      <SubjectFolderCard
                        key={course.id}
                        subject={course.subject}
                        curriculumCourseId={course.id}
                        documentCount={documentCountByCourseId.get(course.id) ?? 0}
                      />
                    );
                  })}
                  {folders.map((folder) => (
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

            {otherDocuments.length > 0 && (
              <section aria-labelledby="other-docs-heading">
                <h2
                  id="other-docs-heading"
                  className="mb-3 font-heading text-sm font-bold uppercase tracking-widest text-brutal-muted"
                >
                  Tài liệu khác
                </h2>
                <FileGrid>
                  {otherDocuments.map((doc) => (
                    <DocumentCard
                      key={doc.id}
                      document={doc}
                      parentId={undefined}
                      onRename={setRenameDoc}
                      onShare={shareDocument}
                    />
                  ))}
                </FileGrid>
              </section>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {folders.length > 0 && (
              <section aria-labelledby="folders-heading">
                <h2
                  id="folders-heading"
                  className="mb-3 font-heading text-sm font-bold uppercase tracking-widest text-brutal-muted"
                >
                  Thư mục
                </h2>
                <FileGrid>
                  {folders.map((folder) => (
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

            {documents.length > 0 && (
              <section aria-labelledby="docs-heading">
                <h2
                  id="docs-heading"
                  className="mb-3 font-heading text-sm font-bold uppercase tracking-widest text-brutal-muted"
                >
                  Tệp
                </h2>
                <FileGrid>
                  {documents.map((doc) => (
                    <DocumentCard
                      key={doc.id}
                      document={doc}
                      parentId={undefined}
                      onRename={setRenameDoc}
                      onShare={shareDocument}
                    />
                  ))}
                </FileGrid>
              </section>
            )}
          </div>
        )}
      </main>

      {uploadOpen && (
        <UploadModal
          key={uploadCourseId ?? "default"}
          folderId={null}
          defaultCurriculumCourseId={uploadCourseId}
          onClose={closeUpload}
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
