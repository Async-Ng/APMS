import { objectIdParamSchema } from "../../validators/common.validator";
import {
  assignCurriculumSemestersSchema,
  catalogCourseSlotsQuerySchema,
  createCourseSlotSchema,
  createCurriculumSchema,
  createSemesterSchema,
  createSubjectSchema,
  listCourseSlotsQuerySchema,
  updateAcademicProfileSchema,
  updateCourseSlotSchema,
  updateCurriculumSchema,
  updateSemesterSchema,
  updateSubjectSchema,
} from "../../validators/academic.validator";
import {
  academicProfileSuccessResponseSchema,
  courseSlotListSuccessResponseSchema,
  curriculumListSuccessResponseSchema,
} from "../schemas/academic";
import { registry, z } from "../setup";
import { bearerSecurity, error400, error401, error403, error404, jsonResponse } from "./helpers";

const entitySchema = z.record(z.string(), z.unknown());
const entityResponse = z.object({ status: z.literal("success"), data: entitySchema });
const listResponse = z.object({ status: z.literal("success"), data: z.array(entitySchema) });
const curriculumParam = z.object({ curriculumId: z.string().regex(/^[a-f\d]{24}$/i) });

function body(schema: z.ZodType) {
  return { content: { "application/json": { schema } } };
}

export function registerAcademicPaths(): void {
  const adminEntities = [
    {
      segment: "curricula",
      create: createCurriculumSchema,
      update: updateCurriculumSchema,
    },
    {
      segment: "semesters",
      create: createSemesterSchema,
      update: updateSemesterSchema,
    },
    {
      segment: "subjects",
      create: createSubjectSchema,
      update: updateSubjectSchema,
    },
  ] as const;

  for (const entity of adminEntities) {
    registry.registerPath({
      method: "get",
      path: `/api/admin/${entity.segment}`,
      tags: ["Admin", "Academic Catalog"],
      security: [...bearerSecurity],
      responses: { 200: jsonResponse(listResponse, "Academic entities"), 401: error401, 403: error403 },
    });
    registry.registerPath({
      method: "post",
      path: `/api/admin/${entity.segment}`,
      tags: ["Admin", "Academic Catalog"],
      security: [...bearerSecurity],
      request: { body: body(entity.create) },
      responses: { 201: jsonResponse(entityResponse, "Created"), 400: error400(), 401: error401, 403: error403 },
    });
    registry.registerPath({
      method: "patch",
      path: `/api/admin/${entity.segment}/{id}`,
      tags: ["Admin", "Academic Catalog"],
      security: [...bearerSecurity],
      request: { params: objectIdParamSchema, body: body(entity.update) },
      responses: { 200: jsonResponse(entityResponse, "Updated"), 400: error400(), 401: error401, 403: error403, 404: error404 },
    });
    registry.registerPath({
      method: "delete",
      path: `/api/admin/${entity.segment}/{id}`,
      tags: ["Admin", "Academic Catalog"],
      security: [...bearerSecurity],
      request: { params: objectIdParamSchema },
      responses: { 200: jsonResponse(entityResponse, "Archived"), 401: error401, 403: error403, 404: error404 },
    });
  }

  registry.registerPath({
    method: "get",
    path: "/api/admin/course-slots",
    tags: ["Admin", "Academic Catalog"],
    security: [...bearerSecurity],
    request: { query: listCourseSlotsQuerySchema },
    responses: { 200: jsonResponse(listResponse, "Course slots"), 401: error401, 403: error403 },
  });
  registry.registerPath({
    method: "post",
    path: "/api/admin/course-slots",
    tags: ["Admin", "Academic Catalog"],
    security: [...bearerSecurity],
    request: { body: body(createCourseSlotSchema) },
    responses: { 201: jsonResponse(entityResponse, "Created"), 400: error400(), 401: error401, 403: error403 },
  });
  registry.registerPath({
    method: "patch",
    path: "/api/admin/course-slots/{id}",
    tags: ["Admin", "Academic Catalog"],
    security: [...bearerSecurity],
    request: { params: objectIdParamSchema, body: body(updateCourseSlotSchema) },
    responses: { 200: jsonResponse(entityResponse, "Updated"), 400: error400(), 401: error401, 403: error403, 404: error404 },
  });
  registry.registerPath({
    method: "delete",
    path: "/api/admin/course-slots/{id}",
    tags: ["Admin", "Academic Catalog"],
    security: [...bearerSecurity],
    request: { params: objectIdParamSchema },
    responses: { 200: jsonResponse(entityResponse, "Archived"), 401: error401, 403: error403, 404: error404 },
  });

  registry.registerPath({
    method: "get",
    path: "/api/admin/curricula/{curriculumId}/semesters",
    tags: ["Admin", "Academic Catalog"],
    security: [...bearerSecurity],
    request: { params: curriculumParam },
    responses: { 200: jsonResponse(listResponse, "Curriculum semesters"), 401: error401, 403: error403, 404: error404 },
  });
  registry.registerPath({
    method: "post",
    path: "/api/admin/curricula/{curriculumId}/semesters",
    tags: ["Admin", "Academic Catalog"],
    security: [...bearerSecurity],
    request: { params: curriculumParam, body: body(assignCurriculumSemestersSchema) },
    responses: { 200: jsonResponse(listResponse, "Assigned"), 400: error400(), 401: error401, 403: error403, 404: error404 },
  });
  registry.registerPath({
    method: "delete",
    path: "/api/admin/curricula/{curriculumId}/semesters/{semesterId}",
    tags: ["Admin", "Academic Catalog"],
    security: [...bearerSecurity],
    request: {
      params: z.object({
        curriculumId: z.string().regex(/^[a-f\d]{24}$/i),
        semesterId: z.string().regex(/^[a-f\d]{24}$/i),
      }),
    },
    responses: { 200: jsonResponse(entityResponse, "Removed"), 401: error401, 403: error403, 404: error404 },
  });

  registry.registerPath({
    method: "get",
    path: "/api/catalog/semesters",
    tags: ["Academic Catalog"],
    security: [...bearerSecurity],
    responses: { 200: jsonResponse(listResponse, "Active semesters"), 401: error401, 403: error403 },
  });
  registry.registerPath({
    method: "get",
    path: "/api/catalog/curricula/{curriculumId}/semesters",
    tags: ["Academic Catalog"],
    security: [...bearerSecurity],
    request: { params: curriculumParam },
    responses: { 200: jsonResponse(listResponse, "Curriculum semesters"), 401: error401, 403: error403, 404: error404 },
  });
  registry.registerPath({
    method: "get",
    path: "/api/catalog/curricula",
    tags: ["Academic Catalog"],
    security: [...bearerSecurity],
    responses: { 200: jsonResponse(curriculumListSuccessResponseSchema, "Active curricula"), 401: error401, 403: error403 },
  });
  registry.registerPath({
    method: "get",
    path: "/api/catalog/curricula/{curriculumId}/course-slots",
    tags: ["Academic Catalog"],
    security: [...bearerSecurity],
    request: { params: curriculumParam, query: catalogCourseSlotsQuerySchema },
    responses: { 200: jsonResponse(courseSlotListSuccessResponseSchema, "Active course slots"), 401: error401, 403: error403, 404: error404 },
  });

  registry.registerPath({
    method: "get",
    path: "/api/users/me/academic-profile",
    tags: ["Users", "Academic Catalog"],
    security: [...bearerSecurity],
    responses: { 200: jsonResponse(academicProfileSuccessResponseSchema, "Academic profile"), 401: error401, 403: error403 },
  });
  registry.registerPath({
    method: "patch",
    path: "/api/users/me/academic-profile",
    tags: ["Users", "Academic Catalog"],
    security: [...bearerSecurity],
    request: { body: body(updateAcademicProfileSchema) },
    responses: { 200: jsonResponse(academicProfileSuccessResponseSchema, "Academic profile"), 400: error400(), 401: error401, 403: error403 },
  });

}
