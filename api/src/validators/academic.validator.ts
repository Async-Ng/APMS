import { z } from "zod";

const objectId = z.string().regex(/^[a-f\d]{24}$/i);
const code = z.string().trim().min(1).max(30).transform((value) => value.toUpperCase());

export const createMajorSchema = z.object({
  code,
  name: z.string().trim().min(1).max(150),
  description: z.string().trim().max(1000).optional(),
});

export const updateMajorSchema = z
  .object({
    code: code.optional(),
    name: z.string().trim().min(1).max(150).optional(),
    description: z.string().trim().max(1000).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "At least one field is required" });

export const createSubjectSchema = z.object({
  code,
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000).optional(),
});

export const updateSubjectSchema = z
  .object({
    code: code.optional(),
    name: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(1000).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "At least one field is required" });

export const createSemesterSchema = z.object({
  code,
  name: z.string().trim().min(1).max(150),
  sortOrder: z.number().int().min(0).optional(),
});

export const updateSemesterSchema = z
  .object({
    code: code.optional(),
    name: z.string().trim().min(1).max(150).optional(),
    sortOrder: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "At least one field is required" });

export const assignMajorSemestersSchema = z.object({
  semesterIds: z.array(objectId).min(1).max(50).transform((ids) => [...new Set(ids)]),
});

export const createCurriculumCourseSchema = z.object({
  majorId: objectId,
  semesterId: objectId,
  subjectId: objectId,
});

export const updateCurriculumCourseSchema = z
  .object({
    majorId: objectId.optional(),
    semesterId: objectId.optional(),
    subjectId: objectId.optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "At least one field is required" });

export const listCurriculumQuerySchema = z.object({
  majorId: objectId.optional(),
  semesterId: objectId.optional(),
  includeInactive: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .default(false),
});

export const catalogCurriculumQuerySchema = z.object({
  semesterId: objectId.optional(),
});

export const updateAcademicProfileSchema = z.object({
  majorId: objectId,
  currentSemesterId: objectId,
  currentSubjectIds: z.array(objectId).min(1).max(30).transform((ids) => [...new Set(ids)]),
});
