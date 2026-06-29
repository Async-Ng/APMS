import type { AcademicProfile, CatalogCurriculumItem } from "@/lib/queries/catalog";
import type { DriveDocument, DocumentSemesterRef } from "@/lib/queries/drive";

import type { DriveViewSemesterId } from "@/stores/drive-view-store";

export interface DriveSemesterTab {
  id: DriveViewSemesterId;
  code: string;
  name: string;
  sortOrder: number;
}

export function collectDriveSemesterTabs(
  profile: AcademicProfile | undefined,
  documents: DriveDocument[],
): DriveSemesterTab[] {
  const byId = new Map<string, DocumentSemesterRef>();

  if (profile?.currentSemester) {
    byId.set(profile.currentSemester.id, profile.currentSemester);
  }

  for (const doc of documents) {
    const semester = doc.curriculumCourse?.semester;
    if (semester?.id) {
      byId.set(semester.id, semester);
    }
  }

  const semesters = [...byId.values()].sort((a, b) => a.sortOrder - b.sortOrder);

  return [
    ...semesters.map((s) => ({
      id: s.id as DriveViewSemesterId,
      code: s.code,
      name: s.name,
      sortOrder: s.sortOrder,
    })),
    { id: "all", code: "ALL", name: "Tất cả", sortOrder: Number.MAX_SAFE_INTEGER },
  ];
}

export function resolveDriveViewSemesterId(
  stored: DriveViewSemesterId | null,
  tabs: DriveSemesterTab[],
  primarySemesterId: string | undefined,
): DriveViewSemesterId {
  if (stored && tabs.some((t) => t.id === stored)) {
    return stored;
  }
  if (primarySemesterId && tabs.some((t) => t.id === primarySemesterId)) {
    return primarySemesterId;
  }
  return tabs[0]?.id ?? "all";
}

export function getCoursesWithRootDocuments(
  documents: DriveDocument[],
  curriculum: CatalogCurriculumItem[],
): CatalogCurriculumItem[] {
  const rootDocs = documents.filter((doc) => doc.folderId === null);
  const courseIdsWithDocs = new Set(
    rootDocs
      .map((doc) => doc.curriculumCourse?.id)
      .filter((id): id is string => Boolean(id)),
  );

  return curriculum
    .filter((course) => course.subject && courseIdsWithDocs.has(course.id))
    .sort((a, b) => (a.subject?.code ?? "").localeCompare(b.subject?.code ?? ""));
}

export function findCourseInCurriculum(
  curriculum: CatalogCurriculumItem[] | undefined,
  curriculumCourseId: string,
): CatalogCurriculumItem | undefined {
  return curriculum?.find((course) => course.id === curriculumCourseId);
}

export function canOpenSubjectCourse(options: {
  course: CatalogCurriculumItem | undefined;
  documents: DriveDocument[];
  enrolledCourseIds: Set<string>;
}): boolean {
  const { course, documents, enrolledCourseIds } = options;
  if (!course?.subject) return false;
  if (enrolledCourseIds.has(course.id)) return true;
  return documents.some(
    (doc) => doc.folderId === null && doc.curriculumCourse?.id === course.id,
  );
}

export function isPrimarySemesterCourse(
  course: CatalogCurriculumItem | undefined,
  primarySemesterId: string | undefined,
  enrolledCourseIds: Set<string>,
): boolean {
  if (!course || !primarySemesterId) return false;
  return course.semesterId === primarySemesterId && enrolledCourseIds.has(course.id);
}
