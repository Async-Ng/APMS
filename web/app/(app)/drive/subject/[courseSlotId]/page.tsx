"use client";

import { use, useMemo, useState } from "react";

import { AskAiLink } from "@/components/app/AskAiLink";
import { DocumentCard } from "@/components/app/DocumentCard";
import { FileGrid } from "@/components/app/FileGrid";
import { DocumentSettingsModal } from "@/components/app/DocumentSettingsModal";
import { ShareModal } from "@/components/app/ShareModal";
import { Topbar } from "@/components/app/Topbar";
import { UploadModal } from "@/components/app/UploadModal";
import { BrutalButton } from "@/components/ui/BrutalButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { SkeletonGrid } from "@/components/ui/SkeletonCard";
import {
  filterRootDocumentsBySlot,
  findEnrolledCourse,
  getEnrolledCourses,
} from "@/lib/drive/academic-grouping";
import {
  canOpenSubjectCourse,
  findSlotInCatalog,
} from "@/lib/drive/semester-view";
import { useAcademicProfile, useCatalogCourseSlots } from "@/lib/queries/catalog";
import type { DriveDocument } from "@/lib/queries/drive";
import { useDriveContents } from "@/lib/queries/drive";

interface PageProps {
  params: Promise<{ courseSlotId: string }>;
}

export default function SubjectDrivePage({ params }: PageProps) {
  const { courseSlotId } = use(params);

  const { data, isLoading, isError } = useDriveContents();
  const { data: profile } = useAcademicProfile();
  const { data: allCurriculum } = useCatalogCourseSlots(profile?.curriculum?.id);

  const documents = data?.documents ?? [];
  const enrolledCourses = useMemo(
    () => getEnrolledCourses(profile, allCurriculum),
    [profile, allCurriculum],
  );
  const enrolledCourseIds = useMemo(
    () => new Set(enrolledCourses.map((c) => c.id)),
    [enrolledCourses],
  );

  const course = useMemo(() => {
    const enrolled = findEnrolledCourse(enrolledCourses, courseSlotId);
    if (enrolled) return enrolled;
    return findSlotInCatalog(allCurriculum, courseSlotId);
  }, [enrolledCourses, allCurriculum, courseSlotId]);

  const canAccess = useMemo(
    () =>
      canOpenSubjectCourse({
        course,
        documents,
        enrolledCourseIds,
      }),
    [course, documents, enrolledCourseIds],
  );

  const canUpload = Boolean(course?.subject && enrolledCourseIds.has(course.id));

  const subjectDocuments = useMemo(
    () => filterRootDocumentsBySlot(documents, courseSlotId),
    [documents, courseSlotId],
  );

  const [uploadOpen, setUploadOpen] = useState(false);
  const [settingsDoc, setSettingsDoc] = useState<DriveDocument | null>(null);
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
        onUploadClick={() => canUpload && setUploadOpen(true)}
        actions={
          course && canUpload ? (
            <AskAiLink
              id={`subject-${courseSlotId}-ask-ai-btn`}
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
                : `Chưa có tài liệu cho môn ${course?.subject?.code ?? ""}.`
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
                  onRename={setSettingsDoc}
                  onShare={shareDocument}
                />
              ))}
            </FileGrid>
          </section>
        )}
      </main>

      {uploadOpen && canUpload && course?.subject && (
        <UploadModal
          key={courseSlotId}
          folderId={null}
          defaultCourseSlotId={courseSlotId}
          onClose={() => setUploadOpen(false)}
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
