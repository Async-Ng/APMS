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

export interface CatalogCurriculumItem {
  id: string;
  majorId: string;
  semesterNumber: number;
  subjectId: string;
  major: CatalogMajor | null;
  subject: CatalogSubject | null;
}

export interface AcademicProfile {
  major: CatalogMajor | null;
  currentSemester: number | null;
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

export interface UpdateAcademicProfileBody {
  majorId: string;
  currentSemester: number;
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

export function useCatalogCurriculum(majorId?: string, semesterNumber?: number) {
  return useQuery({
    queryKey: ["catalog", "curriculum", majorId, semesterNumber],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: CatalogCurriculumItem[] }>(
        `/catalog/majors/${majorId}/curriculum`,
        { params: semesterNumber !== undefined ? { semesterNumber } : undefined },
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
    profileQuery.data?.currentSemester ?? undefined,
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
