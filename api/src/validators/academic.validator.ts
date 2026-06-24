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

export const createCurriculumCourseSchema = z.object({
  majorId: objectId,
  semesterNumber: z.number().int().min(1).max(9),
  subjectId: objectId,
});

export const updateCurriculumCourseSchema = z
  .object({
    majorId: objectId.optional(),
    semesterNumber: z.number().int().min(1).max(9).optional(),
    subjectId: objectId.optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "At least one field is required" });

export const listCurriculumQuerySchema = z.object({
  majorId: objectId.optional(),
  semesterNumber: z.coerce.number().int().min(1).max(9).optional(),
  includeInactive: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .default(false),
});

export const catalogCurriculumQuerySchema = z.object({
  semesterNumber: z.coerce.number().int().min(1).max(9).optional(),
});

export const updateAcademicProfileSchema = z.object({
  majorId: objectId,
  currentSemester: z.number().int().min(1).max(9),
  currentSubjectIds: z.array(objectId).max(30).transform((ids) => [...new Set(ids)]),
});
