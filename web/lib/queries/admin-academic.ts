import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-client";

export interface Major {
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

export interface MajorSemesterLink {
  id: string;
  majorId: string;
  semesterId: string;
  sortOrder: number | null;
  isActive: boolean;
  semester: Semester | null;
  effectiveSortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CurriculumCourse {
  id: string;
  majorId: string;
  semesterId: string;
  subjectId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EnrichedCurriculumCourse extends CurriculumCourse {
  major: Major | null;
  subject: Subject | null;
  semester: Semester | null;
}

function invalidateAcademicCatalog(qc: QueryClient) {
  void qc.invalidateQueries({ queryKey: ["catalog", "majors"] });
  void qc.invalidateQueries({ queryKey: ["catalog", "semesters"] });
  void qc.invalidateQueries({ queryKey: ["catalog", "major-semesters"] });
  void qc.invalidateQueries({ queryKey: ["catalog", "curriculum"] });
  void qc.invalidateQueries({ queryKey: ["users", "me", "academic-profile"] });
  void qc.invalidateQueries({ queryKey: ["documents", "public"] });
}

function invalidateAdminAcademic(qc: QueryClient) {
  invalidateAcademicCatalog(qc);
}

export function useAdminMajors() {
  return useQuery({
    queryKey: ["admin", "majors"],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: Major[] }>(
        "/admin/majors",
      );
      return res.data.data;
    },
  });
}

export function useCreateMajor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      code: string;
      name: string;
      description?: string;
    }) => {
      const res = await api.post<{ status: string; data: Major }>(
        "/admin/majors",
        body,
      );
      return res.data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "majors"] });
      void qc.invalidateQueries({ queryKey: ["admin", "curriculum"] });
      invalidateAdminAcademic(qc);
    },
  });
}

export function useUpdateMajor() {
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
      const res = await api.patch<{ status: string; data: Major }>(
        `/admin/majors/${id}`,
        body,
      );
      return res.data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "majors"] });
      void qc.invalidateQueries({ queryKey: ["admin", "curriculum"] });
      invalidateAdminAcademic(qc);
    },
  });
}

export function useArchiveMajor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete<{ status: string; data: Major }>(
        `/admin/majors/${id}`,
      );
      return res.data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "majors"] });
      void qc.invalidateQueries({ queryKey: ["admin", "curriculum"] });
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

export function useAdminMajorSemesters(majorId: string | undefined) {
  return useQuery({
    queryKey: ["admin", "major-semesters", majorId],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: MajorSemesterLink[] }>(
        `/admin/majors/${majorId}/semesters`,
      );
      return res.data.data;
    },
    enabled: !!majorId,
  });
}

export function useAssignMajorSemesters() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      majorId,
      semesterIds,
    }: {
      majorId: string;
      semesterIds: string[];
    }) => {
      const res = await api.post<{ status: string; data: MajorSemesterLink[] }>(
        `/admin/majors/${majorId}/semesters`,
        { semesterIds },
      );
      return res.data.data;
    },
    onSuccess: (_data, { majorId }) => {
      void qc.invalidateQueries({ queryKey: ["admin", "major-semesters", majorId] });
      invalidateAdminAcademic(qc);
    },
  });
}

export function useArchiveMajorSemester() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      majorId,
      semesterId,
    }: {
      majorId: string;
      semesterId: string;
    }) => {
      const res = await api.delete<{ status: string; data: MajorSemesterLink }>(
        `/admin/majors/${majorId}/semesters/${semesterId}`,
      );
      return res.data.data;
    },
    onSuccess: (_data, { majorId }) => {
      void qc.invalidateQueries({ queryKey: ["admin", "major-semesters", majorId] });
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
      void qc.invalidateQueries({ queryKey: ["admin", "curriculum"] });
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
      void qc.invalidateQueries({ queryKey: ["admin", "curriculum"] });
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
      void qc.invalidateQueries({ queryKey: ["admin", "curriculum"] });
      invalidateAdminAcademic(qc);
    },
  });
}

export function useAdminCurriculum(params: {
  majorId?: string;
  semesterId?: string;
  includeInactive?: boolean;
}) {
  return useQuery({
    queryKey: ["admin", "curriculum", params],
    queryFn: async () => {
      const queryParams: Record<string, string> = {};
      if (params.majorId) queryParams.majorId = params.majorId;
      if (params.semesterId) queryParams.semesterId = params.semesterId;
      if (params.includeInactive) queryParams.includeInactive = "true";

      const res = await api.get<{
        status: string;
        data: EnrichedCurriculumCourse[];
      }>("/admin/curriculum-courses", { params: queryParams });
      return res.data.data;
    },
  });
}

export function useCreateCurriculum() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      majorId: string;
      semesterId: string;
      subjectId: string;
    }) => {
      const res = await api.post<{ status: string; data: CurriculumCourse }>(
        "/admin/curriculum-courses",
        body,
      );
      return res.data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "curriculum"] });
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
        majorId: string;
        semesterId: string;
        subjectId: string;
        isActive: boolean;
      }>;
    }) => {
      const res = await api.patch<{ status: string; data: CurriculumCourse }>(
        `/admin/curriculum-courses/${id}`,
        body,
      );
      return res.data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "curriculum"] });
      invalidateAdminAcademic(qc);
    },
  });
}

export function useArchiveCurriculum() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete<{ status: string; data: CurriculumCourse }>(
        `/admin/curriculum-courses/${id}`,
      );
      return res.data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "curriculum"] });
      invalidateAdminAcademic(qc);
    },
  });
}
