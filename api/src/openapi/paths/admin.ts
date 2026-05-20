import { objectIdParamSchema } from "../../validators/common.validator";
import {
  listUsersQuerySchema,
  updateAdminUserSchema,
} from "../../validators/admin.validator";
import { registry } from "../setup";
import {
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
