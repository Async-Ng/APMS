import { updateUserSchema } from "../../validators/user.validator";
import { registry } from "../setup";
import { userSuccessResponseSchema } from "../schemas/user";
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
}
