import { registry, z } from "../setup";
import { objectIdSchema, successEnvelope } from "./common";

export const majorSchema = registry.register(
  "Major",
  z
    .object({
      id: objectIdSchema,
      code: z.string(),
      name: z.string(),
      description: z.string(),
      isActive: z.boolean(),
      createdAt: z.coerce.date(),
      updatedAt: z.coerce.date(),
    })
    .openapi("Major"),
);

export const subjectSchema = registry.register(
  "Subject",
  z
    .object({
      id: objectIdSchema,
      code: z.string(),
      name: z.string(),
      description: z.string(),
      isActive: z.boolean(),
      createdAt: z.coerce.date(),
      updatedAt: z.coerce.date(),
    })
    .openapi("Subject"),
);

export const curriculumCourseSchema = registry.register(
  "CurriculumCourse",
  z
    .object({
      id: objectIdSchema,
      majorId: objectIdSchema,
      semesterNumber: z.number().int().min(1).max(9),
      subjectId: objectIdSchema,
      isActive: z.boolean(),
      createdAt: z.coerce.date(),
      updatedAt: z.coerce.date(),
      major: majorSchema.nullable(),
      subject: subjectSchema.nullable(),
    })
    .openapi("CurriculumCourse"),
);

export const academicProfileSchema = registry.register(
  "AcademicProfile",
  z
    .object({
      major: majorSchema.nullable(),
      currentSemester: z.number().int().min(1).max(9).nullable(),
      currentSubjects: z.array(subjectSchema),
      isComplete: z.boolean(),
    })
    .openapi("AcademicProfile"),
);

export const majorListSuccessResponseSchema = successEnvelope(
  z.array(majorSchema),
  "MajorList",
);

export const curriculumListSuccessResponseSchema = successEnvelope(
  z.array(curriculumCourseSchema),
  "CurriculumList",
);

export const academicProfileSuccessResponseSchema = successEnvelope(
  academicProfileSchema,
  "AcademicProfile",
);
