import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "../lib/api-client";

export interface CatalogCurriculum {
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

export function useCatalogCurricula() {
  return useQuery({
    queryKey: ["catalog", "curricula"],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: CatalogCurriculum[] }>(
        "/catalog/curricula",
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

export interface UpdateAcademicProfileBody {
  curriculumId: string;
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

export function useCatalogCourseSlots(curriculumId?: string, semesterId?: string) {
  return useQuery({
    queryKey: ["catalog", "course-slots", curriculumId, semesterId],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: CatalogCourseSlot[] }>(
        `/catalog/curricula/${curriculumId}/course-slots`,
        { params: semesterId !== undefined ? { semesterId } : undefined },
      );
      return res.data.data;
    },
    enabled: !!curriculumId,
  });
}

/** Course slots the student is enrolled in for the current semester. */
export function useEnrolledCourses() {
  const profileQuery = useAcademicProfile();
  const slotsQuery = useCatalogCourseSlots(
    profileQuery.data?.curriculum?.id,
    profileQuery.data?.currentSemester?.id,
  );

  const profile = profileQuery.data;
  const enrolledCourses =
    profile?.isComplete && slotsQuery.data
      ? slotsQuery.data.filter(
          (slot) =>
            slot.subject &&
            profile.currentSubjects.some((s) => s.id === slot.subject?.id),
        )
      : [];

  return {
    profile,
    enrolledCourses,
    isLoading: profileQuery.isLoading || slotsQuery.isLoading,
  };
}
