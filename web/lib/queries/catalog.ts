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

export interface CatalogCurriculumItem {
  id: string;
  majorId: string;
  semesterNumber: number;
  subjectId: string;
  isActive: boolean;
  major: CatalogMajor | null;
  subject: CatalogSubject | null;
}

export interface AcademicProfile {
  major: CatalogMajor | null;
  currentSemester: number | null;
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

export function useCatalogCurriculum(
  majorId: string | undefined,
  semesterNumber?: number,
) {
  return useQuery({
    queryKey: ["catalog", "curriculum", majorId, semesterNumber],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: CatalogCurriculumItem[] }>(
        `/catalog/majors/${majorId}/curriculum`,
        {
          params:
            semesterNumber !== undefined
              ? { semesterNumber }
              : undefined,
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
