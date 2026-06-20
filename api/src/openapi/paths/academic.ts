import { objectIdParamSchema } from "../../validators/common.validator";
import {
  catalogCurriculumQuerySchema,
  createCurriculumCourseSchema,
  createMajorSchema,
  createSubjectSchema,
  listCurriculumQuerySchema,
  listLibraryDocumentsQuerySchema,
  updateAcademicProfileSchema,
  updateCurriculumCourseSchema,
  updateMajorSchema,
  updateSubjectSchema,
} from "../../validators/academic.validator";
import { registry, z } from "../setup";
import { bearerSecurity, error400, error401, error403, error404, jsonResponse } from "./helpers";

const entitySchema = z.record(z.string(), z.unknown());
const entityResponse = z.object({ status: z.literal("success"), data: entitySchema });
const listResponse = z.object({ status: z.literal("success"), data: z.array(entitySchema) });
const majorParam = z.object({ majorId: z.string().regex(/^[a-f\d]{24}$/i) });

function body(schema: z.ZodType) {
  return { content: { "application/json": { schema } } };
}

export function registerAcademicPaths(): void {
  const adminEntities = [
    {
      segment: "majors",
      create: createMajorSchema,
      update: updateMajorSchema,
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
    path: "/api/admin/curriculum-courses",
    tags: ["Admin", "Academic Catalog"],
    security: [...bearerSecurity],
    request: { query: listCurriculumQuerySchema },
    responses: { 200: jsonResponse(listResponse, "Curriculum"), 401: error401, 403: error403 },
  });
  registry.registerPath({
    method: "post",
    path: "/api/admin/curriculum-courses",
    tags: ["Admin", "Academic Catalog"],
    security: [...bearerSecurity],
    request: { body: body(createCurriculumCourseSchema) },
    responses: { 201: jsonResponse(entityResponse, "Created"), 400: error400(), 401: error401, 403: error403 },
  });
  registry.registerPath({
    method: "patch",
    path: "/api/admin/curriculum-courses/{id}",
    tags: ["Admin", "Academic Catalog"],
    security: [...bearerSecurity],
    request: { params: objectIdParamSchema, body: body(updateCurriculumCourseSchema) },
    responses: { 200: jsonResponse(entityResponse, "Updated"), 400: error400(), 401: error401, 403: error403, 404: error404 },
  });
  registry.registerPath({
    method: "delete",
    path: "/api/admin/curriculum-courses/{id}",
    tags: ["Admin", "Academic Catalog"],
    security: [...bearerSecurity],
    request: { params: objectIdParamSchema },
    responses: { 200: jsonResponse(entityResponse, "Archived"), 401: error401, 403: error403, 404: error404 },
  });

  registry.registerPath({
    method: "get",
    path: "/api/catalog/majors",
    tags: ["Academic Catalog"],
    security: [...bearerSecurity],
    responses: { 200: jsonResponse(listResponse, "Active majors"), 401: error401, 403: error403 },
  });
  registry.registerPath({
    method: "get",
    path: "/api/catalog/majors/{majorId}/curriculum",
    tags: ["Academic Catalog"],
    security: [...bearerSecurity],
    request: { params: majorParam, query: catalogCurriculumQuerySchema },
    responses: { 200: jsonResponse(listResponse, "Active curriculum"), 401: error401, 403: error403, 404: error404 },
  });

  registry.registerPath({
    method: "get",
    path: "/api/users/me/academic-profile",
    tags: ["Users", "Academic Catalog"],
    security: [...bearerSecurity],
    responses: { 200: jsonResponse(entityResponse, "Academic profile"), 401: error401, 403: error403 },
  });
  registry.registerPath({
    method: "patch",
    path: "/api/users/me/academic-profile",
    tags: ["Users", "Academic Catalog"],
    security: [...bearerSecurity],
    request: { body: body(updateAcademicProfileSchema) },
    responses: { 200: jsonResponse(entityResponse, "Academic profile"), 400: error400(), 401: error401, 403: error403 },
  });

  registry.registerPath({
    method: "get",
    path: "/api/library/documents",
    tags: ["Internal Library"],
    security: [...bearerSecurity],
    request: { query: listLibraryDocumentsQuerySchema },
    responses: { 200: jsonResponse(entityResponse, "Paginated internal documents"), 401: error401, 403: error403 },
  });
  registry.registerPath({
    method: "get",
    path: "/api/library/documents/{id}",
    tags: ["Internal Library"],
    security: [...bearerSecurity],
    request: { params: objectIdParamSchema },
    responses: { 200: jsonResponse(entityResponse, "Internal document"), 401: error401, 403: error403, 404: error404 },
  });
}
