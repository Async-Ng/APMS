import type {
  AcademicProfile,
  CatalogCourseSlot,
  CatalogSubject,
} from "@/lib/queries/catalog";
import type { DriveDocument } from "@/lib/queries/drive";

export interface SubjectDocumentGroup {
  subject: CatalogSubject;
  courseSlotId: string;
  documents: DriveDocument[];
}

/** Course slots in the student's curriculum. */
export function getEnrolledCourses(
  profile: AcademicProfile | undefined,
  curriculum: CatalogCourseSlot[] | undefined,
): CatalogCourseSlot[] {
  if (!profile?.isComplete || !curriculum) return [];
  return curriculum
    .filter((course) => course.subject)
    .sort((a, b) =>
      (a.semester?.sortOrder ?? 0) - (b.semester?.sortOrder ?? 0) ||
      (a.subject?.code ?? "").localeCompare(b.subject?.code ?? ""),
    );
}

function matchesEnrolledCourse(
  doc: DriveDocument,
  enrolledCourseIds: Set<string>,
): boolean {
  const course = doc.courseSlot;
  if (!course?.subject) return false;
  return Boolean(course.id && enrolledCourseIds.has(course.id));
}

/** Find an enrolled curriculum course by id. */
export function findEnrolledCourse(
  enrolledCourses: CatalogCourseSlot[],
  courseSlotId: string,
): (CatalogCourseSlot & { subject: CatalogSubject }) | undefined {
  const course = enrolledCourses.find((c) => c.id === courseSlotId);
  if (!course?.subject) return undefined;
  return course as CatalogCourseSlot & { subject: CatalogSubject };
}

/** Root-level documents for a specific curriculum course. */
export function filterRootDocumentsBySlot(
  documents: DriveDocument[],
  courseSlotId: string,
): DriveDocument[] {
  return documents.filter(
    (doc) =>
      doc.folderId === null && doc.courseSlot?.id === courseSlotId,
  );
}

/** Group root-level documents by curriculum course (exact course id). */
export function groupRootDocumentsByCourse(
  documents: DriveDocument[],
  courses: CatalogCourseSlot[],
): SubjectDocumentGroup[] {
  const rootDocs = documents.filter((doc) => doc.folderId === null);

  return courses
    .filter((course): course is CatalogCourseSlot & { subject: CatalogSubject } =>
      course.subject !== null,
    )
    .map((course) => ({
      subject: course.subject,
      courseSlotId: course.id,
      documents: rootDocs.filter((doc) => doc.courseSlot?.id === course.id),
    }));
}

/** Group root-level documents by enrolled subject (one section per subject). */
export function groupRootDocumentsBySubject(
  documents: DriveDocument[],
  enrolledCourses: CatalogCourseSlot[],
): SubjectDocumentGroup[] {
  return groupRootDocumentsByCourse(documents, enrolledCourses);
}

/** Root documents that do not belong to any course slot in the student's curriculum. */
export function getOtherRootDocuments(
  documents: DriveDocument[],
  enrolledCourses: CatalogCourseSlot[],
): DriveDocument[] {
  const enrolledCourseIds = new Set(enrolledCourses.map((c) => c.id));

  return documents.filter(
    (doc) =>
      doc.folderId === null &&
      !matchesEnrolledCourse(doc, enrolledCourseIds),
  );
}
