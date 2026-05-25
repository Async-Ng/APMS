import { updateUserSchema } from "../../validators/user.validator";
import { userSearchQuerySchema } from "../../validators/share.validator";
import { registry, z } from "../setup";
import { userSuccessResponseSchema } from "../schemas/user";
import { shareUserSchema } from "../schemas/share";
import { successEnvelope } from "../schemas/common";
import { bearerSecurity, error400, error401, error403, jsonResponse } from "./helpers";

export function registerUsersPaths(): void {
  registry.registerPath({
    method: "patch",
    path: "/api/users/me",
    tags: ["Users"],
    summary: "Update current user profile",
    security: [...bearerSecurity],
    request: {
      body: {
        content: {
          "application/json": {
            schema: updateUserSchema,
          },
        },
      },
    },
    responses: {
      200: jsonResponse(userSuccessResponseSchema, "Updated user"),
      400: error400("Validation error"),
      401: error401,
      403: error403,
    },
  });

  registry.registerPath({
    method: "get",
    path: "/api/users/search",
    tags: ["Users", "Shares"],
    summary: "Search users for sharing",
    description:
      "Search active users by email (exact) or displayName (partial). Returns public-safe fields only. Max 10 results.",
    security: [...bearerSecurity],
    request: {
      query: userSearchQuerySchema,
    },
    responses: {
      200: jsonResponse(
        successEnvelope(
          registry.register(
            "UserSearchResults",
            z.array(shareUserSchema).openapi("UserSearchResults"),
          ),
          "UserSearchResults",
        ),
        "Matching users",
      ),
      400: error400("Must provide email or displayName"),
      401: error401,
      403: error403,
    },
  });
}
