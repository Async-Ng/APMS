import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api-client";

export interface CatalogMajor {
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

export interface CatalogMajorSemester {
  id: string;
  majorId: string;
  semesterId: string;
  sortOrder: number | null;
  isActive: boolean;
  semester: CatalogSemester | null;
  effectiveSortOrder: number;
}

export interface CatalogCurriculumItem {
  id: string;
  majorId: string;
  semesterId: string;
  subjectId: string;
  isActive: boolean;
  major: CatalogMajor | null;
  subject: CatalogSubject | null;
  semester: CatalogSemester | null;
}

export interface AcademicProfile {
  major: CatalogMajor | null;
  currentSemester: CatalogSemester | null;
  currentSubjects: CatalogSubject[];
  isComplete: boolean;
}

export function useCatalogMajors() {
  return useQuery({
    queryKey: ["catalog", "majors"],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: CatalogMajor[] }>(
        "/catalog/majors",
      );
      return res.data.data;
    },
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

export function useCatalogMajorSemesters(majorId: string | undefined) {
  return useQuery({
    queryKey: ["catalog", "major-semesters", majorId],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: CatalogMajorSemester[] }>(
        `/catalog/majors/${majorId}/semesters`,
      );
      return res.data.data;
    },
    enabled: !!majorId,
  });
}

export function useCatalogCurriculum(
  majorId: string | undefined,
  semesterId?: string,
) {
  return useQuery({
    queryKey: ["catalog", "curriculum", majorId, semesterId],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: CatalogCurriculumItem[] }>(
        `/catalog/majors/${majorId}/curriculum`,
        {
          params: semesterId !== undefined ? { semesterId } : undefined,
        },
      );
      return res.data.data;
    },
    enabled: !!majorId,
  });
}

export function useAcademicProfile() {
  return useQuery({
    queryKey: ["users", "me", "academic-profile"],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: AcademicProfile }>(
        "/users/me/academic-profile",
      );
      return res.data.data;
    },
  });
}