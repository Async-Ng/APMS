import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api-client";

export interface CatalogCurriculum {
  id: string;
  code: string;
  name: string;
  description: string;
  isActive: boolean;
}

export interface CatalogSubject {
  id: string;
  code: string;
  name: string;
  description: string;
  isActive: boolean;
}

export interface CatalogSemester {
  id: string;
  code: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
}

export interface CatalogCurriculumSemester {
  id: string;
  curriculumId: string;
  semesterId: string;
  sortOrder: number | null;
  isActive: boolean;
  semester: CatalogSemester | null;
  effectiveSortOrder: number;
}

export interface CatalogCourseSlot {
  id: string;
  curriculumId: string;
  semesterId: string;
  subjectId: string;
  isActive: boolean;
  curriculum: CatalogCurriculum | null;
  subject: CatalogSubject | null;
  semester: CatalogSemester | null;
}

export interface AcademicProfile {
  curriculum: CatalogCurriculum | null;
  currentSemester: CatalogSemester | null;
  currentSubjects: CatalogSubject[];
  isComplete: boolean;
}

export function useCatalogCurricula(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["catalog", "curricula"],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: CatalogCurriculum[] }>(
        "/catalog/curricula",
      );
      return res.data.data;
    },
    enabled: options?.enabled ?? true,
  });
}

export function useCatalogSemesters() {
  return useQuery({
    queryKey: ["catalog", "semesters"],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: CatalogSemester[] }>(
        "/catalog/semesters",
      );
      return res.data.data;
    },
  });
}

export function useCatalogCurriculumSemesters(curriculumId: string | undefined) {
  return useQuery({
    queryKey: ["catalog", "curriculum-semesters", curriculumId],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: CatalogCurriculumSemester[] }>(
        `/catalog/curricula/${curriculumId}/semesters`,
      );
      return res.data.data;
    },
    enabled: !!curriculumId,
  });
}

export function useCatalogCourseSlots(
  curriculumId: string | undefined,
  semesterId?: string,
) {
  return useQuery({
    queryKey: ["catalog", "course-slots", curriculumId, semesterId],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: CatalogCourseSlot[] }>(
        `/catalog/curricula/${curriculumId}/course-slots`,
        {
          params: semesterId !== undefined ? { semesterId } : undefined,
        },
      );
      return res.data.data;
    },
    enabled: !!curriculumId,
  });
}

export function useAcademicProfile(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["users", "me", "academic-profile"],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: AcademicProfile }>(
        "/users/me/academic-profile",
      );
      return res.data.data;
    },
    enabled: options?.enabled ?? true,
  });
}
