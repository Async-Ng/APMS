"use client";

import { FolderPlus } from "lucide-react";
import { useMemo, useState } from "react";

import { AskAiLink } from "@/components/app/AskAiLink";
import { DocumentCard } from "@/components/app/DocumentCard";
import { DriveAcademicBanner } from "@/components/app/drive/DriveAcademicBanner";
import { DriveListView } from "@/components/app/drive/DriveListView";
import { MobileQuickActionsMenu } from "@/components/app/drive/MobileQuickActionsMenu";
import { SubjectFolderCard } from "@/components/app/drive/SubjectFolderCard";
import { FileGrid } from "@/components/app/FileGrid";
import { FolderCard } from "@/components/app/FolderCard";
import { DocumentSettingsModal } from "@/components/app/DocumentSettingsModal";
import { FolderModal } from "@/components/app/FolderModal";
import { ShareModal } from "@/components/app/ShareModal";
import { Topbar } from "@/components/app/Topbar";
import { UploadModal } from "@/components/app/UploadModal";
import { BrutalButton } from "@/components/ui/BrutalButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { SkeletonGrid } from "@/components/ui/SkeletonCard";
import { ViewToggle, type ViewMode } from "@/components/ui/ViewToggle";
import {
  getEnrolledCourses,
  getOtherRootDocuments,
  groupRootDocumentsByCourse,
} from "@/lib/drive/academic-grouping";
import {
  useAcademicProfile,
  useCatalogCourseSlots,
} from "@/lib/queries/catalog";
import type { DriveDocument, DriveFolder } from "@/lib/queries/drive";
import { useDriveContents } from "@/lib/queries/drive";

export default function DrivePage() {
  const { data, isLoading, isError, refetch } = useDriveContents();
  const { data: profile, isLoading: isProfileLoading } = useAcademicProfile();
  const documents = data?.documents ?? [];

  const { data: primaryCurriculum } = useCatalogCourseSlots(
    profile?.curriculum?.id,
  );

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadCourseId, setUploadCourseId] = useState<string | undefined>();
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [renameFolder, setRenameFolder] = useState<DriveFolder | null>(null);
  const [settingsDoc, setSettingsDoc] = useState<DriveDocument | null>(null);
  const [shareTarget, setShareTarget] = useState<{
    resourceType: "folder" | "document";
    resourceId: string;
    resourceName: string;
  } | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const profileComplete = Boolean(profile?.isComplete);
  const enrolledCourses = useMemo(
    () => getEnrolledCourses(profile, primaryCurriculum),
    [profile, primaryCurriculum],
  );

  const displayCourses = useMemo(() => {
    if (!profileComplete) return [];
    return enrolledCourses;
  }, [profileComplete, enrolledCourses]);

  const subjectGroups = useMemo(
    () => groupRootDocumentsByCourse(documents, displayCourses),
    [documents, displayCourses],
  );
  const documentCountByCourseId = useMemo(
    () => new Map(subjectGroups.map((g) => [g.courseSlotId, g.documents.length])),
    [subjectGroups],
  );
  const otherDocuments = useMemo(
    () => getOtherRootDocuments(documents, enrolledCourses, undefined),
    [documents, enrolledCourses],
  );

  const folders = data?.folders ?? [];
  const showAcademicLayout =
    profileComplete && (displayCourses.length > 0 || folders.length > 0) && !isLoading;
  const hasUnifiedFolders =
    showAcademicLayout && (displayCourses.length > 0 || folders.length > 0);
  const isEmpty =
    !isLoading &&
    !showAcademicLayout &&
    folders.length === 0 &&
    documents.length === 0;

  function openUpload(courseSlotId?: string) {
    setUploadCourseId(courseSlotId);
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
        onUploadClick={() => openUpload()}
        suppressMobileUpload
        actions={
          <>
            <AskAiLink id="drive-ask-ai-btn" href="/chat" />
            <MobileQuickActionsMenu
              onUpload={() => openUpload()}
              onNewFolder={() => setFolderModalOpen(true)}
            />
            <BrutalButton
              id="new-folder-btn"
              variant="ghost"
              onClick={() => setFolderModalOpen(true)}
              className="hidden w-auto! shrink-0 whitespace-nowrap sm:inline-flex"
            >
              <FolderPlus className="h-4 w-4" aria-hidden="true" />
              Thư mục mới
            </BrutalButton>
          </>
        }
      />

      <main className="flex-1 p-4 sm:p-6" id="main-content">
        <DriveAcademicBanner
          profile={profile}
          isLoading={isProfileLoading}
        />

        {!isLoading && !isEmpty && (
          <ViewToggle view={viewMode} onChange={setViewMode} className="mb-4" />
        )}

        {isError && (
          <ErrorAlert
            className="mb-4"
            message="Không tải được tài liệu. Kiểm tra kết nối mạng và thử lại."
            actionLabel="Tải lại"
            onAction={() => void refetch()}
          />
        )}

        {isLoading ? (
          <FileGrid>
            <SkeletonGrid count={10} />
          </FileGrid>
        ) : isEmpty ? (
          <EmptyState
            title="Drive trống"
            description="Tải slide buổi học vừa rồi — PDF, DOCX hoặc PPTX, gắn đúng môn là xong."
            action={
              <BrutalButton variant="primary" onClick={() => openUpload()}>
                Tải slide ngay
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
                {viewMode === "grid" ? (
                  <FileGrid>
                    {displayCourses.map((course) => {
                      if (!course.subject) return null;
                      return (
                        <SubjectFolderCard
                          key={course.id}
                          subject={course.subject}
                          courseSlotId={course.id}
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
                ) : (
                  <DriveListView
                    subjects={displayCourses
                      .filter((course) => course.subject)
                      .map((course) => ({
                        courseSlotId: course.id,
                        label: `${course.subject!.code} — ${course.subject!.name}`,
                        documentCount: documentCountByCourseId.get(course.id) ?? 0,
                      }))}
                    folders={
                      folders.map((folder) => ({ folder }))
                    }
                  />
                )}
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
                {viewMode === "grid" ? (
                  <FileGrid>
                    {otherDocuments.map((doc) => (
                      <DocumentCard
                        key={doc.id}
                        document={doc}
                        parentId={undefined}
                        onRename={setSettingsDoc}
                        onShare={shareDocument}
                      />
                    ))}
                  </FileGrid>
                ) : (
                  <DriveListView documents={otherDocuments} />
                )}
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
                {viewMode === "grid" ? (
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
                ) : (
                  <DriveListView folders={folders.map((folder) => ({ folder }))} />
                )}
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
                {viewMode === "grid" ? (
                  <FileGrid>
                    {documents.map((doc) => (
                      <DocumentCard
                        key={doc.id}
                        document={doc}
                        parentId={undefined}
                        onRename={setSettingsDoc}
                        onShare={shareDocument}
                      />
                    ))}
                  </FileGrid>
                ) : (
                  <DriveListView documents={documents} />
                )}
              </section>
            )}
          </div>
        )}
      </main>

      {uploadOpen && (
        <UploadModal
          key={uploadCourseId ?? "default"}
          folderId={null}
          defaultCourseSlotId={uploadCourseId}
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

      {settingsDoc && (
        <DocumentSettingsModal
          document={settingsDoc}
          onClose={() => setSettingsDoc(null)}
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
