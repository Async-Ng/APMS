"use client";

import { FolderPlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AskAiLink } from "@/components/app/AskAiLink";
import { DocumentCard } from "@/components/app/DocumentCard";
import { DriveAcademicBanner } from "@/components/app/drive/DriveAcademicBanner";
import { DriveSemesterTabs } from "@/components/app/drive/DriveSemesterTabs";
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
  groupRootDocumentsByCourse,
} from "@/lib/drive/academic-grouping";
import {
  collectDriveSemesterTabs,
  getCoursesWithRootDocuments,
  resolveDriveViewSemesterId,
} from "@/lib/drive/semester-view";
import {
  useAcademicProfile,
  useCatalogCurriculum,
  useCatalogMajorSemesters,
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

  const { data: primaryCurriculum } = useCatalogCurriculum(
    profile?.major?.id,
    primarySemesterId,
  );
  const { data: pastSemesterCurriculum } = useCatalogCurriculum(
    profile?.major?.id,
    pastViewSemesterId,
  );

  const { data: majorSemesters } = useCatalogMajorSemesters(profile?.major?.id);
  const availableSemesters = useMemo(
    () =>
      (majorSemesters ?? [])
        .filter((link) => link.isActive && link.semester)
        .map((link) => link.semester!)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [majorSemesters],
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
    () => new Map(subjectGroups.map((g) => [g.curriculumCourseId, g.documents.length])),
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

  function openUpload(curriculumCourseId?: string) {
    if (uploadDisabledForView) return;
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
        onUploadClick={() => openUpload()}
        actions={
          <>
            <AskAiLink id="drive-ask-ai-btn" href="/chat" />
            <BrutalButton
              id="new-folder-btn"
              variant="ghost"
              onClick={() => setFolderModalOpen(true)}
              className="hidden w-auto! shrink-0 whitespace-nowrap sm:inline-flex"
              disabled={uploadDisabledForView}
              title={
                uploadDisabledForView
                  ? "Chỉ tạo thư mục khi xem học kỳ chính hoặc Tất cả"
                  : undefined
              }
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
                <FileGrid>
                  {displayCourses.map((course) => {
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

      {uploadOpen && !uploadDisabledForView && (
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
