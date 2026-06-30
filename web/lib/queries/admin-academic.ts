import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-client";

export interface Curriculum {
  id: string;
  code: string;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Semester {
  id: string;
  code: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CurriculumSemesterLink {
  id: string;
  curriculumId: string;
  semesterId: string;
  sortOrder: number | null;
  isActive: boolean;
  semester: Semester | null;
  effectiveSortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CourseSlot {
  id: string;
  curriculumId: string;
  semesterId: string;
  subjectId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EnrichedCourseSlot extends CourseSlot {
  curriculum: Curriculum | null;
  subject: Subject | null;
  semester: Semester | null;
}

function invalidateAcademicCatalog(qc: QueryClient) {
  void qc.invalidateQueries({ queryKey: ["catalog", "curricula"] });
  void qc.invalidateQueries({ queryKey: ["catalog", "semesters"] });
  void qc.invalidateQueries({ queryKey: ["catalog", "curriculum-semesters"] });
  void qc.invalidateQueries({ queryKey: ["catalog", "course-slots"] });
  void qc.invalidateQueries({ queryKey: ["users", "me", "academic-profile"] });
  void qc.invalidateQueries({ queryKey: ["documents", "public"] });
}

function invalidateAdminAcademic(qc: QueryClient) {
  invalidateAcademicCatalog(qc);
}

export function useAdminCurricula() {
  return useQuery({
    queryKey: ["admin", "curricula"],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: Curriculum[] }>(
        "/admin/curricula",
      );
      return res.data.data;
    },
  });
}

export function useCreateCurriculum() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      code: string;
      name: string;
      description?: string;
    }) => {
      const res = await api.post<{ status: string; data: Curriculum }>(
        "/admin/curricula",
        body,
      );
      return res.data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "curricula"] });
      void qc.invalidateQueries({ queryKey: ["admin", "course-slots"] });
      invalidateAdminAcademic(qc);
    },
  });
}

export function useUpdateCurriculum() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      body,
    }: {
      id: string;
      body: Partial<{
        code: string;
        name: string;
        description: string;
        isActive: boolean;
      }>;
    }) => {
      const res = await api.patch<{ status: string; data: Curriculum }>(
        `/admin/curricula/${id}`,
        body,
      );
      return res.data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "curricula"] });
      void qc.invalidateQueries({ queryKey: ["admin", "course-slots"] });
      invalidateAdminAcademic(qc);
    },
  });
}

export function useArchiveCurriculum() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete<{ status: string; data: Curriculum }>(
        `/admin/curricula/${id}`,
      );
      return res.data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "curricula"] });
      void qc.invalidateQueries({ queryKey: ["admin", "course-slots"] });
      invalidateAdminAcademic(qc);
    },
  });
}

export function useAdminSemesters() {
  return useQuery({
    queryKey: ["admin", "semesters"],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: Semester[] }>(
        "/admin/semesters",
      );
      return res.data.data;
    },
  });
}

export function useCreateSemester() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      code: string;
      name: string;
      sortOrder?: number;
    }) => {
      const res = await api.post<{ status: string; data: Semester }>(
        "/admin/semesters",
        body,
      );
      return res.data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "semesters"] });
      invalidateAdminAcademic(qc);
    },
  });
}

export function useUpdateSemester() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      body,
    }: {
      id: string;
      body: Partial<{
        code: string;
        name: string;
        sortOrder: number;
        isActive: boolean;
      }>;
    }) => {
      const res = await api.patch<{ status: string; data: Semester }>(
        `/admin/semesters/${id}`,
        body,
      );
      return res.data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "semesters"] });
      invalidateAdminAcademic(qc);
    },
  });
}

export function useArchiveSemester() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete<{ status: string; data: Semester }>(
        `/admin/semesters/${id}`,
      );
      return res.data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "semesters"] });
      invalidateAdminAcademic(qc);
    },
  });
}

export function useAdminCurriculumSemesters(curriculumId: string | undefined) {
  return useQuery({
    queryKey: ["admin", "curriculum-semesters", curriculumId],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: CurriculumSemesterLink[] }>(
        `/admin/curricula/${curriculumId}/semesters`,
      );
      return res.data.data;
    },
    enabled: !!curriculumId,
  });
}

export function useAssignCurriculumSemesters() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      curriculumId,
      semesterIds,
    }: {
      curriculumId: string;
      semesterIds: string[];
    }) => {
      const res = await api.post<{ status: string; data: CurriculumSemesterLink[] }>(
        `/admin/curricula/${curriculumId}/semesters`,
        { semesterIds },
      );
      return res.data.data;
    },
    onSuccess: (_data, { curriculumId }) => {
      void qc.invalidateQueries({ queryKey: ["admin", "curriculum-semesters", curriculumId] });
      invalidateAdminAcademic(qc);
    },
  });
}

export function useArchiveCurriculumSemester() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      curriculumId,
      semesterId,
    }: {
      curriculumId: string;
      semesterId: string;
    }) => {
      const res = await api.delete<{ status: string; data: CurriculumSemesterLink }>(
        `/admin/curricula/${curriculumId}/semesters/${semesterId}`,
      );
      return res.data.data;
    },
    onSuccess: (_data, { curriculumId }) => {
      void qc.invalidateQueries({ queryKey: ["admin", "curriculum-semesters", curriculumId] });
      invalidateAdminAcademic(qc);
    },
  });
}

export function useAdminSubjects() {
  return useQuery({
    queryKey: ["admin", "subjects"],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: Subject[] }>(
        "/admin/subjects",
      );
      return res.data.data;
    },
  });
}

export function useCreateSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      code: string;
      name: string;
      description?: string;
    }) => {
      const res = await api.post<{ status: string; data: Subject }>(
        "/admin/subjects",
        body,
      );
      return res.data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "subjects"] });
      void qc.invalidateQueries({ queryKey: ["admin", "course-slots"] });
      invalidateAdminAcademic(qc);
    },
  });
}

export function useUpdateSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      body,
    }: {
      id: string;
      body: Partial<{
        code: string;
        name: string;
        description: string;
        isActive: boolean;
      }>;
    }) => {
      const res = await api.patch<{ status: string; data: Subject }>(
        `/admin/subjects/${id}`,
        body,
      );
      return res.data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "subjects"] });
      void qc.invalidateQueries({ queryKey: ["admin", "course-slots"] });
      invalidateAdminAcademic(qc);
    },
  });
}

export function useArchiveSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete<{ status: string; data: Subject }>(
        `/admin/subjects/${id}`,
      );
      return res.data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "subjects"] });
      void qc.invalidateQueries({ queryKey: ["admin", "course-slots"] });
      invalidateAdminAcademic(qc);
    },
  });
}

export function useAdminCourseSlots(params: {
  curriculumId?: string;
  semesterId?: string;
  includeInactive?: boolean;
}) {
  return useQuery({
    queryKey: ["admin", "course-slots", params],
    queryFn: async () => {
      const queryParams: Record<string, string> = {};
      if (params.curriculumId) queryParams.curriculumId = params.curriculumId;
      if (params.semesterId) queryParams.semesterId = params.semesterId;
      if (params.includeInactive) queryParams.includeInactive = "true";

      const res = await api.get<{
        status: string;
        data: EnrichedCourseSlot[];
      }>("/admin/course-slots", { params: queryParams });
      return res.data.data;
    },
  });
}

export function useCreateCourseSlot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      curriculumId: string;
      semesterId: string;
      subjectId: string;
    }) => {
      const res = await api.post<{ status: string; data: CourseSlot }>(
        "/admin/course-slots",
        body,
      );
      return res.data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "course-slots"] });
      invalidateAdminAcademic(qc);
    },
  });
}

export function useUpdateCourseSlot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      body,
    }: {
      id: string;
      body: Partial<{
        curriculumId: string;
        semesterId: string;
        subjectId: string;
        isActive: boolean;
      }>;
    }) => {
      const res = await api.patch<{ status: string; data: CourseSlot }>(
        `/admin/course-slots/${id}`,
        body,
      );
      return res.data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "course-slots"] });
      invalidateAdminAcademic(qc);
    },
  });
}

export function useArchiveCourseSlot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete<{ status: string; data: CourseSlot }>(
        `/admin/course-slots/${id}`,
      );
      return res.data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "course-slots"] });
      invalidateAdminAcademic(qc);
    },
  });
}
