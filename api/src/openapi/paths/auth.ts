import { registry } from "../setup";
import { userSuccessResponseSchema } from "../schemas/user";
import { bearerSecurity, error401, jsonResponse } from "./helpers";

export function registerAuthPaths(): void {
  registry.registerPath({
    method: "get",
    path: "/api/auth/me",
    tags: ["Auth"],
    summary: "Get current user profile",
    description:
      "Syncs Cognito profile to MongoDB. Does not require active account (disabled users can still call).",
    security: [...bearerSecurity],
    responses: {
      200: jsonResponse(userSuccessResponseSchema, "Current user"),
      401: error401,
    },
  });
}
