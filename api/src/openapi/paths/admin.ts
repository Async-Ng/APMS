import { objectIdParamSchema } from "../../validators/common.validator";
import {
  bulkAccessEmailsSchema,
  listAccessEmailsQuerySchema,
  listUsersQuerySchema,
  updateAccessEmailSchema,
  updateAdminUserSchema,
} from "../../validators/admin.validator";
import { registry } from "../setup";
import {
  accessEmailListSuccessResponseSchema,
  accessEmailSuccessResponseSchema,
  bulkAccessEmailSuccessResponseSchema,
  systemStatsSuccessResponseSchema,
  userListSuccessResponseSchema,
} from "../schemas/admin";
import { userSuccessResponseSchema } from "../schemas/user";
import {
  bearerSecurity,
  error400,
  error401,
  error403,
  error404,
  error409,
  jsonResponse,
} from "./helpers";

export function registerAdminPaths(): void {
  registry.registerPath({
    method: "get",
    path: "/api/admin/stats",
    tags: ["Admin"],
    summary: "System statistics",
    security: [...bearerSecurity],
    responses: {
      200: jsonResponse(systemStatsSuccessResponseSchema, "System stats"),
      401: error401,
      403: error403,
    },
  });

  registry.registerPath({
    method: "get",
    path: "/api/admin/access-emails",
    tags: ["Admin"],
    summary: "List email access exceptions",
    security: [...bearerSecurity],
    request: { query: listAccessEmailsQuerySchema },
    responses: {
      200: jsonResponse(accessEmailListSuccessResponseSchema, "Paginated access emails"),
      401: error401,
      403: error403,
    },
  });

  registry.registerPath({
    method: "post",
    path: "/api/admin/access-emails/bulk",
    tags: ["Admin"],
    summary: "Add or reactivate email access exceptions",
    security: [...bearerSecurity],
    request: {
      body: {
        content: { "application/json": { schema: bulkAccessEmailsSchema } },
      },
    },
    responses: {
      200: jsonResponse(bulkAccessEmailSuccessResponseSchema, "Per-entry bulk result"),
      400: error400("Invalid bulk request"),
      401: error401,
      403: error403,
    },
  });

  registry.registerPath({
    method: "patch",
    path: "/api/admin/access-emails/{id}",
    tags: ["Admin"],
    summary: "Update or reactivate an email access exception",
    security: [...bearerSecurity],
    request: {
      params: objectIdParamSchema,
      body: {
        content: { "application/json": { schema: updateAccessEmailSchema } },
      },
    },
    responses: {
      200: jsonResponse(accessEmailSuccessResponseSchema, "Updated access email"),
      400: error400(),
      401: error401,
      403: error403,
      404: error404,
      409: error409,
    },
  });

  registry.registerPath({
    method: "delete",
    path: "/api/admin/access-emails/{id}",
    tags: ["Admin"],
    summary: "Deactivate an email access exception",
    security: [...bearerSecurity],
    request: { params: objectIdParamSchema },
    responses: {
      200: jsonResponse(accessEmailSuccessResponseSchema, "Deactivated access email"),
      401: error401,
      403: error403,
      404: error404,
      409: error409,
    },
  });

  registry.registerPath({
    method: "get",
    path: "/api/admin/users",
    tags: ["Admin"],
    summary: "List users",
    security: [...bearerSecurity],
    request: {
      query: listUsersQuerySchema,
    },
    responses: {
      200: jsonResponse(userListSuccessResponseSchema, "Paginated users"),
      401: error401,
      403: error403,
    },
  });

  registry.registerPath({
    method: "get",
    path: "/api/admin/users/{id}",
    tags: ["Admin"],
    summary: "Get user by id",
    security: [...bearerSecurity],
    request: { params: objectIdParamSchema },
    responses: {
      200: jsonResponse(userSuccessResponseSchema, "User"),
      401: error401,
      403: error403,
      404: error404,
    },
  });

  registry.registerPath({
    method: "patch",
    path: "/api/admin/users/{id}",
    tags: ["Admin"],
    summary: "Update user (quota / disabled)",
    security: [...bearerSecurity],
    request: {
      params: objectIdParamSchema,
      body: {
        content: {
          "application/json": {
            schema: updateAdminUserSchema,
          },
        },
      },
    },
    responses: {
      200: jsonResponse(userSuccessResponseSchema, "Updated user"),
      400: error400("Validation error or cannot disable self"),
      401: error401,
      403: error403,
      404: error404,
    },
  });
}
