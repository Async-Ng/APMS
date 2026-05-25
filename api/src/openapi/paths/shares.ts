import { objectIdParamSchema } from "../../validators/common.validator";
import { createShareSchema } from "../../validators/share.validator";
import {
  createSharesSuccessSchema,
  sharedByMeItemSchema,
  sharedWithMeItemSchema,
} from "../schemas/share";
import { registry, z } from "../setup";
import {
  bearerSecurity,
  error400,
  error401,
  error403,
  error404,
  jsonResponse,
} from "./helpers";
import { successEnvelope } from "../schemas/common";

const sharedWithMeListSchema = successEnvelope(
  registry.register(
    "SharedWithMeList",
    z.array(sharedWithMeItemSchema).openapi("SharedWithMeList"),
  ),
  "SharedWithMeList",
);

const sharedByMeListSchema = successEnvelope(
  registry.register(
    "SharedByMeList",
    z.array(sharedByMeItemSchema).openapi("SharedByMeList"),
  ),
  "SharedByMeList",
);

export function registerSharesPaths(): void {
  // POST /api/shares — create shares (batch)
  registry.registerPath({
    method: "post",
    path: "/api/shares",
    tags: ["Shares"],
    summary: "Share a resource with one or more users",
    description:
      "Share a folder or document with multiple recipients in a single request. Duplicate shares are skipped silently.",
    security: [...bearerSecurity],
    request: {
      body: {
        content: {
          "application/json": {
            schema: createShareSchema,
          },
        },
      },
    },
    responses: {
      201: jsonResponse(createSharesSuccessSchema, "Shares created — includes created count and skipped count"),
      400: error400("Validation error or no valid recipients found"),
      401: error401,
      403: error403,
      404: error404,
    },
  });

  // DELETE /api/shares/:id — revoke a share
  registry.registerPath({
    method: "delete",
    path: "/api/shares/{id}",
    tags: ["Shares"],
    summary: "Revoke a share",
    description: "Only the original owner can revoke a share record.",
    security: [...bearerSecurity],
    request: { params: objectIdParamSchema },
    responses: {
      204: { description: "Share revoked successfully" },
      401: error401,
      403: error403,
      404: error404,
    },
  });

  // GET /api/shares/with-me
  registry.registerPath({
    method: "get",
    path: "/api/shares/with-me",
    tags: ["Shares"],
    summary: "List resources shared with me",
    description: "Returns share records and populated resource data for items shared with the current user.",
    security: [...bearerSecurity],
    responses: {
      200: jsonResponse(sharedWithMeListSchema, "Shares received"),
      401: error401,
      403: error403,
    },
  });

  // GET /api/shares/by-me
  registry.registerPath({
    method: "get",
    path: "/api/shares/by-me",
    tags: ["Shares"],
    summary: "List resources I have shared",
    description:
      "Returns shares grouped by resource, with the populated list of recipients for each resource.",
    security: [...bearerSecurity],
    responses: {
      200: jsonResponse(sharedByMeListSchema, "Shares given"),
      401: error401,
      403: error403,
    },
  });
}
