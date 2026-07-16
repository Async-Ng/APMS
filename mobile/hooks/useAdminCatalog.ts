import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "../lib/api-client";

export interface Curriculum {
  id: string;
  code: string;
  name: string;
  description?: string;
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

export interface Subject {
  id: string;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CurriculumSemesterLink {
  id: string;
  curriculumId: string;
  semesterId: string;
  isActive: boolean;
  semester: Semester | null;
  effectiveSortOrder: number;
}

export interface CourseSlot {
  id: string;
  curriculumId: string;
  semesterId: string;
  subjectId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  curriculum: Curriculum | null;
  subject: Subject | null;
  semester: Semester | null;
}

const catalogKeys = {
  curricula: ["admin", "curricula"] as const,
  semesters: ["admin", "semesters"] as const,
  subjects: ["admin", "subjects"] as const,
  curriculumSemesters: (curriculumId: string) => ["admin", "curricula", curriculumId, "semesters"] as const,
  courseSlots: ["admin", "course-slots"] as const,
};

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: ["admin", "curricula"] });
  void qc.invalidateQueries({ queryKey: ["admin", "semesters"] });
  void qc.invalidateQueries({ queryKey: ["admin", "subjects"] });
  void qc.invalidateQueries({ queryKey: catalogKeys.courseSlots });
}

// Curricula

export function useAdminCurricula() {
  return useQuery({
    queryKey: catalogKeys.curricula,
    queryFn: async () => {
      const res = await api.get<{ status: string; data: Curriculum[] }>("/admin/curricula");
      return res.data.data;
    },
  });
}

export function useCreateCurriculum() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { code: string; name: string; description?: string }) => {
      const res = await api.post<{ status: string; data: Curriculum }>("/admin/curricula", body);
      return res.data.data;
    },
    onSuccess: () => invalidateAll(qc),
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
      body: { code?: string; name?: string; description?: string; isActive?: boolean };
    }) => {
      const res = await api.patch<{ status: string; data: Curriculum }>(`/admin/curricula/${id}`, body);
      return res.data.data;
    },
    onSuccess: () => invalidateAll(qc),
  });
}

export function useArchiveCurriculum() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/curricula/${id}`),
    onSuccess: () => invalidateAll(qc),
  });
}

// Semesters

export function useAdminSemesters() {
  return useQuery({
    queryKey: catalogKeys.semesters,
    queryFn: async () => {
      const res = await api.get<{ status: string; data: Semester[] }>("/admin/semesters");
      return res.data.data;
    },
  });
}

export function useCreateSemester() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { code: string; name: string; sortOrder?: number }) => {
      const res = await api.post<{ status: string; data: Semester }>("/admin/semesters", body);
      return res.data.data;
    },
    onSuccess: () => invalidateAll(qc),
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
      body: { code?: string; name?: string; sortOrder?: number; isActive?: boolean };
    }) => {
      const res = await api.patch<{ status: string; data: Semester }>(`/admin/semesters/${id}`, body);
      return res.data.data;
    },
    onSuccess: () => invalidateAll(qc),
  });
}

export function useArchiveSemester() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/semesters/${id}`),
    onSuccess: () => invalidateAll(qc),
  });
}

// Subjects

export function useAdminSubjects() {
  return useQuery({
    queryKey: catalogKeys.subjects,
    queryFn: async () => {
      const res = await api.get<{ status: string; data: Subject[] }>("/admin/subjects");
      return res.data.data;
    },
  });
}

export function useCreateSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { code: string; name: string; description?: string }) => {
      const res = await api.post<{ status: string; data: Subject }>("/admin/subjects", body);
      return res.data.data;
    },
    onSuccess: () => invalidateAll(qc),
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
      body: { code?: string; name?: string; description?: string; isActive?: boolean };
    }) => {
      const res = await api.patch<{ status: string; data: Subject }>(`/admin/subjects/${id}`, body);
      return res.data.data;
    },
    onSuccess: () => invalidateAll(qc),
  });
}

export function useArchiveSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/subjects/${id}`),
    onSuccess: () => invalidateAll(qc),
  });
}

// Curriculum <-> Semester links

export function useCurriculumSemesters(curriculumId: string | undefined) {
  return useQuery({
    queryKey: curriculumId ? catalogKeys.curriculumSemesters(curriculumId) : ["admin", "curricula", "none"],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: CurriculumSemesterLink[] }>(
        `/admin/curricula/${curriculumId}/semesters`,
      );
      return res.data.data;
    },
    enabled: Boolean(curriculumId),
  });
}

export function useAssignCurriculumSemesters() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ curriculumId, semesterIds }: { curriculumId: string; semesterIds: string[] }) => {
      const res = await api.post<{ status: string; data: CurriculumSemesterLink[] }>(
        `/admin/curricula/${curriculumId}/semesters`,
        { semesterIds },
      );
      return res.data.data;
    },
    onSuccess: (_data, { curriculumId }) => {
      void qc.invalidateQueries({ queryKey: catalogKeys.curriculumSemesters(curriculumId) });
    },
  });
}

export function useRemoveCurriculumSemester() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ curriculumId, semesterId }: { curriculumId: string; semesterId: string }) =>
      api.delete(`/admin/curricula/${curriculumId}/semesters/${semesterId}`),
    onSuccess: (_data, { curriculumId }) => {
      void qc.invalidateQueries({ queryKey: catalogKeys.curriculumSemesters(curriculumId) });
    },
  });
}

// Course slots

export function useAdminCourseSlots(filters?: { curriculumId?: string; semesterId?: string }) {
  return useQuery({
    queryKey: [...catalogKeys.courseSlots, filters?.curriculumId, filters?.semesterId],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: CourseSlot[] }>("/admin/course-slots", {
        params: { curriculumId: filters?.curriculumId, semesterId: filters?.semesterId },
      });
      return res.data.data;
    },
  });
}

export function useCreateCourseSlot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { curriculumId: string; semesterId: string; subjectId: string }) => {
      const res = await api.post<{ status: string; data: CourseSlot }>("/admin/course-slots", body);
      return res.data.data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: catalogKeys.courseSlots }),
  });
}

export interface BulkCourseSlotResult {
  created: CourseSlot[];
  skipped: { subjectId: string; reason: string }[];
}

export function useCreateCourseSlotsBulk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { curriculumId: string; semesterId: string; subjectIds: string[] }) => {
      const res = await api.post<{ status: string; data: BulkCourseSlotResult }>(
        "/admin/course-slots/bulk",
        body,
      );
      return res.data.data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: catalogKeys.courseSlots }),
  });
}

export function useArchiveCourseSlot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/course-slots/${id}`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: catalogKeys.courseSlots }),
  });
}
