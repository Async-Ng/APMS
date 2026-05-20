import { registry } from "../setup";
import { apiHealthResponseSchema, rootHealthResponseSchema } from "../schemas/common";
import { jsonResponse } from "./helpers";

export function registerHealthPaths(): void {
  registry.registerPath({
    method: "get",
    path: "/health",
    tags: ["Health"],
    summary: "Root health check",
    responses: {
      200: jsonResponse(rootHealthResponseSchema, "OK"),
    },
  });

  registry.registerPath({
    method: "get",
    path: "/api/health",
    tags: ["Health"],
    summary: "API health check",
    responses: {
      200: jsonResponse(apiHealthResponseSchema, "API service health"),
    },
  });
}
