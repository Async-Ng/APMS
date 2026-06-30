import { registry, z } from "../setup";
import { objectIdSchema, successEnvelope } from "./common";

export const curriculumSchema = registry.register(
  "Curriculum",
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
    .openapi("Curriculum"),
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

export const courseSlotSchema = registry.register(
  "CourseSlot",
  z
    .object({
      id: objectIdSchema,
      curriculumId: objectIdSchema,
      semesterId: objectIdSchema,
      subjectId: objectIdSchema,
      isActive: z.boolean(),
      createdAt: z.coerce.date(),
      updatedAt: z.coerce.date(),
      curriculum: curriculumSchema.nullable(),
      subject: subjectSchema.nullable(),
      semester: z.record(z.string(), z.unknown()).nullable(),
    })
    .openapi("CourseSlot"),
);

export const academicProfileSchema = registry.register(
  "AcademicProfile",
  z
    .object({
      curriculum: curriculumSchema.nullable(),
      currentSemester: z.record(z.string(), z.unknown()).nullable(),
      currentSubjects: z.array(subjectSchema),
      isComplete: z.boolean(),
    })
    .openapi("AcademicProfile"),
);

export const curriculumListSuccessResponseSchema = successEnvelope(
  z.array(curriculumSchema),
  "CurriculumList",
);

export const courseSlotListSuccessResponseSchema = successEnvelope(
  z.array(courseSlotSchema),
  "CourseSlotList",
);

export const academicProfileSuccessResponseSchema = successEnvelope(
  academicProfileSchema,
  "AcademicProfile",
);
