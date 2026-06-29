"use client";

import { use, useMemo, useState } from "react";

import { AskAiLink } from "@/components/app/AskAiLink";
import { DocumentCard } from "@/components/app/DocumentCard";
import { FileGrid } from "@/components/app/FileGrid";
import { FolderModal } from "@/components/app/FolderModal";
import { ShareModal } from "@/components/app/ShareModal";
import { Topbar } from "@/components/app/Topbar";
import { UploadModal } from "@/components/app/UploadModal";
import { BrutalButton } from "@/components/ui/BrutalButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { SkeletonGrid } from "@/components/ui/SkeletonCard";
import {
  filterRootDocumentsByCourse,
  findEnrolledCourse,
  getEnrolledCourses,
} from "@/lib/drive/academic-grouping";
import {
  canOpenSubjectCourse,
  findCourseInCurriculum,
  isPrimarySemesterCourse,
} from "@/lib/drive/semester-view";
import { useAcademicProfile, useCatalogCurriculum } from "@/lib/queries/catalog";
import type { DriveDocument } from "@/lib/queries/drive";
import { useDriveContents } from "@/lib/queries/drive";

interface PageProps {
  params: Promise<{ curriculumCourseId: string }>;
}

export default function SubjectDrivePage({ params }: PageProps) {
  const { curriculumCourseId } = use(params);

  const { data, isLoading, isError } = useDriveContents();
  const { data: profile } = useAcademicProfile();
  const { data: allCurriculum } = useCatalogCurriculum(profile?.major?.id);
  const { data: primaryCurriculum } = useCatalogCurriculum(
    profile?.major?.id,
    profile?.currentSemester?.id,
  );

  const documents = data?.documents ?? [];
  const enrolledCourses = useMemo(
    () => getEnrolledCourses(profile, primaryCurriculum),
    [profile, primaryCurriculum],
  );
  const enrolledCourseIds = useMemo(
    () => new Set(enrolledCourses.map((c) => c.id)),
    [enrolledCourses],
  );

  const course = useMemo(() => {
    const enrolled = findEnrolledCourse(enrolledCourses, curriculumCourseId);
    if (enrolled) return enrolled;
    return findCourseInCurriculum(allCurriculum, curriculumCourseId);
  }, [enrolledCourses, allCurriculum, curriculumCourseId]);

  const canAccess = useMemo(
    () =>
      canOpenSubjectCourse({
        course,
        documents,
        enrolledCourseIds,
      }),
    [course, documents, enrolledCourseIds],
  );

  const canUpload = useMemo(
    () =>
      isPrimarySemesterCourse(
        course,
        profile?.currentSemester?.id,
        enrolledCourseIds,
      ),
    [course, profile?.currentSemester?.id, enrolledCourseIds],
  );

  const subjectDocuments = useMemo(
    () => filterRootDocumentsByCourse(documents, curriculumCourseId),
    [documents, curriculumCourseId],
  );

  const [uploadOpen, setUploadOpen] = useState(false);
  const [renameDoc, setRenameDoc] = useState<DriveDocument | null>(null);
  const [shareTarget, setShareTarget] = useState<{
    resourceType: "folder" | "document";
    resourceId: string;
    resourceName: string;
  } | null>(null);

  const subjectLabel = course?.subject
    ? `${course.subject.code} — ${course.subject.name}`
    : "Môn học";
  const isEmpty = !isLoading && subjectDocuments.length === 0;

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
        breadcrumbs={[
          { label: "Drive của tôi", href: "/drive" },
          { label: isLoading || !course ? "…" : course.subject?.code ?? "…" },
        ]}
        onMenuOpen={() => {}}
        onUploadClick={() => canUpload && setUploadOpen(true)}
        actions={
          course && canUpload ? (
            <AskAiLink
              id={`subject-${curriculumCourseId}-ask-ai-btn`}
              href="/chat"
            />
          ) : undefined
        }
      />

      <main className="flex-1 p-4 sm:p-6" id="main-content">
        {!isLoading && !canAccess && (
          <ErrorAlert
            className="mb-4"
            message="Không tìm thấy môn học hoặc bạn không có tài liệu cho môn này."
            actionLabel="Về Drive"
            onAction={() => {
              window.location.href = "/drive";
            }}
          />
        )}

        {canAccess && course?.subject && (
          <p className="mb-4 text-sm text-brutal-muted">{subjectLabel}</p>
        )}

        {canAccess && !canUpload && (
          <ErrorAlert
            variant="inline"
            className="mb-4"
            message={`Chỉ upload vào học kỳ chính (${profile?.currentSemester?.code ?? ""}). Dùng「Lên học kỳ」trên Drive hoặc sửa Hồ sơ để đổi học kỳ chính.`}
          />
        )}

        {isError && (
          <ErrorAlert
            className="mb-4"
            message="Không tải được tài liệu. Vui lòng thử lại."
            actionLabel="Tải lại"
            onAction={() => window.location.reload()}
          />
        )}

        {isLoading ? (
          <FileGrid>
            <SkeletonGrid count={8} />
          </FileGrid>
        ) : !canAccess ? null : isEmpty ? (
          <EmptyState
            title="Chưa có tài liệu"
            description={
              canUpload
                ? `Tải lên tệp PDF, DOCX hoặc PPTX cho môn ${course?.subject?.code ?? ""}.`
                : `Chưa có tài liệu cho môn ${course?.subject?.code ?? ""} ở học kỳ này.`
            }
            action={
              canUpload ? (
                <BrutalButton variant="primary" onClick={() => setUploadOpen(true)}>
                  Tải lên tệp
                </BrutalButton>
              ) : undefined
            }
          />
        ) : (
          <section aria-labelledby="subject-docs-heading">
            <h2
              id="subject-docs-heading"
              className="mb-3 font-heading text-sm font-bold uppercase tracking-widest text-brutal-muted"
            >
              Tệp
            </h2>
            <FileGrid>
              {subjectDocuments.map((doc) => (
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
      </main>

      {uploadOpen && canUpload && course?.subject && (
        <UploadModal
          key={curriculumCourseId}
          folderId={null}
          defaultCurriculumCourseId={curriculumCourseId}
          onClose={() => setUploadOpen(false)}
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
