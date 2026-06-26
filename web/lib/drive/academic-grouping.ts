import type {
  AcademicProfile,
  CatalogCurriculumItem,
  CatalogSubject,
} from "@/lib/queries/catalog";
import type { DriveDocument } from "@/lib/queries/drive";

export interface SubjectDocumentGroup {
  subject: CatalogSubject;
  curriculumCourseId: string;
  documents: DriveDocument[];
}

/** Courses the student is enrolled in for the current semester. */
export function getEnrolledCourses(
  profile: AcademicProfile | undefined,
  curriculum: CatalogCurriculumItem[] | undefined,
): CatalogCurriculumItem[] {
  if (!profile?.isComplete || !curriculum) return [];
  const enrolledSubjectIds = new Set(profile.currentSubjects.map((s) => s.id));
  return curriculum
    .filter(
      (course) => course.subject && enrolledSubjectIds.has(course.subject.id),
    )
    .sort((a, b) =>
      (a.subject?.code ?? "").localeCompare(b.subject?.code ?? ""),
    );
}

function matchesEnrolledCourse(
  doc: DriveDocument,
  enrolledCourseIds: Set<string>,
  enrolledSubjectIds: Set<string>,
  semesterNumber: number | null | undefined,
): boolean {
  const course = doc.curriculumCourse;
  if (!course?.subject) return false;
  if (course.id && enrolledCourseIds.has(course.id)) return true;
  if (semesterNumber !== null && semesterNumber !== undefined) {
    return (
      course.semesterNumber === semesterNumber &&
      enrolledSubjectIds.has(course.subject.id)
    );
  }
  return enrolledSubjectIds.has(course.subject.id);
}

/** Find an enrolled curriculum course by id. */
export function findEnrolledCourse(
  enrolledCourses: CatalogCurriculumItem[],
  curriculumCourseId: string,
): (CatalogCurriculumItem & { subject: CatalogSubject }) | undefined {
  const course = enrolledCourses.find((c) => c.id === curriculumCourseId);
  if (!course?.subject) return undefined;
  return course as CatalogCurriculumItem & { subject: CatalogSubject };
}

/** Root-level documents for a specific curriculum course. */
export function filterRootDocumentsByCourse(
  documents: DriveDocument[],
  curriculumCourseId: string,
): DriveDocument[] {
  return documents.filter(
    (doc) =>
      doc.folderId === null && doc.curriculumCourse?.id === curriculumCourseId,
  );
}

/** Group root-level documents by enrolled subject (one section per subject). */
export function groupRootDocumentsBySubject(
  documents: DriveDocument[],
  enrolledCourses: CatalogCurriculumItem[],
): SubjectDocumentGroup[] {
  const rootDocs = documents.filter((doc) => doc.folderId === null);

  return enrolledCourses
    .filter((course): course is CatalogCurriculumItem & { subject: CatalogSubject } =>
      course.subject !== null,
    )
    .map((course) => ({
      subject: course.subject,
      curriculumCourseId: course.id,
      documents: rootDocs.filter(
        (doc) => doc.curriculumCourse?.subject?.id === course.subject.id,
      ),
    }));
}

/** Root documents that do not belong to any enrolled subject for the current semester. */
export function getOtherRootDocuments(
  documents: DriveDocument[],
  enrolledCourses: CatalogCurriculumItem[],
  currentSemester: number | null | undefined,
): DriveDocument[] {
  const enrolledCourseIds = new Set(enrolledCourses.map((c) => c.id));
  const enrolledSubjectIds = new Set(
    enrolledCourses
      .map((c) => c.subject?.id)
      .filter((id): id is string => Boolean(id)),
  );

  return documents.filter(
    (doc) =>
      doc.folderId === null &&
      !matchesEnrolledCourse(
        doc,
        enrolledCourseIds,
        enrolledSubjectIds,
        currentSemester,
      ),
  );
}
