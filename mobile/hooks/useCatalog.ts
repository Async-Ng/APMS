import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "../lib/api-client";

export interface CatalogMajor {
  id: string;
  code: string;
  name: string;
}

export interface CatalogSubject {
  id: string;
  code: string;
  name: string;
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

export function useCatalogMajors() {
  return useQuery({
    queryKey: ["catalog", "majors"],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: CatalogMajor[] }>("/catalog/majors");
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

export interface UpdateAcademicProfileBody {
  majorId: string;
  currentSemesterId: string;
  currentSubjectIds: string[];
}

export function useUpdateAcademicProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateAcademicProfileBody) => {
      const res = await api.patch<{ status: string; data: AcademicProfile }>(
        "/users/me/academic-profile",
        input,
      );
      return res.data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["users", "me", "academic-profile"] });
      void qc.invalidateQueries({ queryKey: ["documents", "public"] });
    },
  });
}

export function useCatalogCurriculum(majorId?: string, semesterId?: string) {
  return useQuery({
    queryKey: ["catalog", "curriculum", majorId, semesterId],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: CatalogCurriculumItem[] }>(
        `/catalog/majors/${majorId}/curriculum`,
        { params: semesterId !== undefined ? { semesterId } : undefined },
      );
      return res.data.data;
    },
    enabled: !!majorId,
  });
}

/** Courses the student is enrolled in for the current semester — the only
 *  mappings the upload API will accept. */
export function useEnrolledCourses() {
  const profileQuery = useAcademicProfile();
  const curriculumQuery = useCatalogCurriculum(
    profileQuery.data?.major?.id,
    profileQuery.data?.currentSemester?.id,
  );

  const profile = profileQuery.data;
  const enrolledCourses =
    profile?.isComplete && curriculumQuery.data
      ? curriculumQuery.data.filter(
          (course) =>
            course.subject &&
            profile.currentSubjects.some((s) => s.id === course.subject?.id),
        )
      : [];

  return {
    profile,
    enrolledCourses,
    isLoading: profileQuery.isLoading || curriculumQuery.isLoading,
  };
}
