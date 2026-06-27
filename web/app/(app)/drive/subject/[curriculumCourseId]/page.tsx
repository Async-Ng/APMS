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
  const { data: curriculum } = useCatalogCurriculum(
    profile?.major?.id,
    profile?.currentSemester?.id,
  );

  const enrolledCourses = useMemo(
    () => getEnrolledCourses(profile, curriculum),
    [profile, curriculum],
  );
  const course = useMemo(
    () => findEnrolledCourse(enrolledCourses, curriculumCourseId),
    [enrolledCourses, curriculumCourseId],
  );
  const documents = useMemo(
    () => filterRootDocumentsByCourse(data?.documents ?? [], curriculumCourseId),
    [data?.documents, curriculumCourseId],
  );

  const [uploadOpen, setUploadOpen] = useState(false);
  const [renameDoc, setRenameDoc] = useState<DriveDocument | null>(null);
  const [shareTarget, setShareTarget] = useState<{
    resourceType: "folder" | "document";
    resourceId: string;
    resourceName: string;
  } | null>(null);

  const subjectLabel = course
    ? `${course.subject.code} — ${course.subject.name}`
    : "Môn học";
  const isEmpty = !isLoading && documents.length === 0;

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
          { label: isLoading || !course ? "…" : course.subject.code },
        ]}
        onMenuOpen={() => {}}
        onUploadClick={() => setUploadOpen(true)}
        actions={
          course ? (
            <AskAiLink
              id={`subject-${curriculumCourseId}-ask-ai-btn`}
              href="/chat"
            />
          ) : undefined
        }
      />

      <main className="flex-1 p-4 sm:p-6" id="main-content">
        {!isLoading && !course && (
          <ErrorAlert
            className="mb-4"
            message="Không tìm thấy môn học hoặc môn không thuộc học kỳ đang học."
            actionLabel="Về Drive"
            onAction={() => {
              window.location.href = "/drive";
            }}
          />
        )}

        {course && (
          <p className="mb-4 text-sm text-brutal-muted">{subjectLabel}</p>
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
        ) : !course ? null : isEmpty ? (
          <EmptyState
            title="Chưa có tài liệu"
            description={`Tải lên tệp PDF, DOCX hoặc PPTX cho môn ${course.subject.code}.`}
            action={
              <BrutalButton variant="primary" onClick={() => setUploadOpen(true)}>
                Tải lên tệp
              </BrutalButton>
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
      </main>

      {uploadOpen && course && (
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
