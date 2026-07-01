import type { CatalogCourseSlot } from "@/lib/queries/catalog";
import type { DriveDocument } from "@/lib/queries/drive";

export function findSlotInCatalog(
  curriculum: CatalogCourseSlot[] | undefined,
  courseSlotId: string,
): CatalogCourseSlot | undefined {
  return curriculum?.find((course) => course.id === courseSlotId);
}

export function canOpenSubjectCourse(options: {
  course: CatalogCourseSlot | undefined;
  documents: DriveDocument[];
  enrolledCourseIds: Set<string>;
}): boolean {
  const { course, documents, enrolledCourseIds } = options;
  if (!course?.subject) return false;
  if (enrolledCourseIds.has(course.id)) return true;
  return documents.some(
    (doc) => doc.folderId === null && doc.courseSlot?.id === course.id,
  );
}
