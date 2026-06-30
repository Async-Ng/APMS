"use client";

import { FolderPlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AskAiLink } from "@/components/app/AskAiLink";
import { DocumentCard } from "@/components/app/DocumentCard";
import { DriveAcademicBanner } from "@/components/app/drive/DriveAcademicBanner";
import { DriveListView } from "@/components/app/drive/DriveListView";
import { DriveSemesterTabs } from "@/components/app/drive/DriveSemesterTabs";
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
  collectDriveSemesterTabs,
  getCoursesWithRootDocuments,
  resolveDriveViewSemesterId,
} from "@/lib/drive/semester-view";
import {
  useAcademicProfile,
  useCatalogCourseSlots,
  useCatalogCurriculumSemesters,
} from "@/lib/queries/catalog";
import type { DriveDocument, DriveFolder } from "@/lib/queries/drive";
import { useDriveContents } from "@/lib/queries/drive";
import { useDriveViewStore } from "@/stores/drive-view-store";

export default function DrivePage() {
  const { data, isLoading, isError, refetch } = useDriveContents();
  const { data: profile, isLoading: isProfileLoading } = useAcademicProfile();
  const storedViewSemesterId = useDriveViewStore((s) => s.driveViewSemesterId);
  const setDriveViewSemesterId = useDriveViewStore((s) => s.setDriveViewSemesterId);

  const primarySemesterId = profile?.currentSemester?.id;
  const documents = data?.documents ?? [];
  const semesterTabs = useMemo(
    () => collectDriveSemesterTabs(profile, documents),
    [profile, documents],
  );
  const viewSemesterId = resolveDriveViewSemesterId(
    storedViewSemesterId,
    semesterTabs,
    primarySemesterId,
  );

  useEffect(() => {
    if (
      storedViewSemesterId !== null &&
      !semesterTabs.some((t) => t.id === storedViewSemesterId)
    ) {
      setDriveViewSemesterId(
        resolveDriveViewSemesterId(null, semesterTabs, primarySemesterId),
      );
    }
  }, [storedViewSemesterId, semesterTabs, primarySemesterId, setDriveViewSemesterId]);

  const isAllView = viewSemesterId === "all";
  const pastViewSemesterId =
    !isAllView && viewSemesterId !== primarySemesterId ? viewSemesterId : undefined;

  const { data: primaryCurriculum } = useCatalogCourseSlots(
    profile?.curriculum?.id,
    primarySemesterId,
  );
  const { data: pastSemesterCurriculum } = useCatalogCourseSlots(
    profile?.curriculum?.id,
    pastViewSemesterId,
  );

  const { data: curriculumSemesters } = useCatalogCurriculumSemesters(profile?.curriculum?.id);
  const availableSemesters = useMemo(
    () =>
      (curriculumSemesters ?? [])
        .filter((link) => link.isActive && link.semester)
        .map((link) => link.semester!)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [curriculumSemesters],
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
    if (isAllView) return enrolledCourses;
    if (viewSemesterId === primarySemesterId) return enrolledCourses;
    return getCoursesWithRootDocuments(documents, pastSemesterCurriculum ?? []);
  }, [
    profileComplete,
    isAllView,
    viewSemesterId,
    primarySemesterId,
    enrolledCourses,
    documents,
    pastSemesterCurriculum,
  ]);

  const subjectGroups = useMemo(
    () => groupRootDocumentsByCourse(documents, displayCourses),
    [documents, displayCourses],
  );
  const documentCountByCourseId = useMemo(
    () => new Map(subjectGroups.map((g) => [g.courseSlotId, g.documents.length])),
    [subjectGroups],
  );
  const otherDocuments = useMemo(
    () =>
      isAllView
        ? getOtherRootDocuments(documents, enrolledCourses, primarySemesterId)
        : [],
    [isAllView, documents, enrolledCourses, primarySemesterId],
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

  const uploadDisabledForView =
    !isAllView && viewSemesterId !== primarySemesterId;

  function openUpload(courseSlotId?: string) {
    if (uploadDisabledForView) return;
    setUploadCourseId(courseSlotId);
    setUploadOpen(true);
  }

  function closeUpload() {
    setUploadOpen(false);
    setUploadCourseId(undefined);
  }

  const uploadDisabledTitle = uploadDisabledForView
    ? "Chỉ tải lên khi xem học kỳ chính hoặc Tất cả"
    : undefined;

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
              uploadDisabled={uploadDisabledForView}
              newFolderDisabled={uploadDisabledForView}
              uploadDisabledReason={uploadDisabledTitle}
              newFolderDisabledReason={uploadDisabledTitle}
            />
            <BrutalButton
              id="new-folder-btn"
              variant="ghost"
              onClick={() => setFolderModalOpen(true)}
              className="hidden w-auto! shrink-0 whitespace-nowrap sm:inline-flex"
              disabled={uploadDisabledForView}
              title={uploadDisabledTitle}
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
          viewSemesterId={viewSemesterId}
          availableSemesters={availableSemesters}
        />

        {profileComplete && semesterTabs.length > 1 && (
          <DriveSemesterTabs
            tabs={semesterTabs}
            activeId={viewSemesterId}
            primarySemesterId={primarySemesterId}
            onChange={setDriveViewSemesterId}
          />
        )}

        {uploadDisabledForView && (
          <ErrorAlert
            variant="inline"
            className="mb-4"
            message={`Đang xem học kỳ khác — chỉ xem/tải tài liệu. Upload và thư mục mới dùng học kỳ chính (${profile?.currentSemester?.code ?? ""}).`}
          />
        )}

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
              !uploadDisabledForView ? (
                <BrutalButton variant="primary" onClick={() => openUpload()}>
                  Tải slide ngay
                </BrutalButton>
              ) : undefined
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
                    {isAllView &&
                      folders.map((folder) => (
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
                      isAllView ? folders.map((folder) => ({ folder })) : []
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

      {uploadOpen && !uploadDisabledForView && (
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
