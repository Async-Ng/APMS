import { objectIdParamSchema } from "../../validators/common.validator";
import { registry, z } from "../setup";
import {
  forumDocumentSuccessResponseSchema,
  forumDocumentsSuccessResponseSchema,
} from "../schemas/forum";
import { bearerSecurity, error401, error403, error404, jsonResponse } from "./helpers";
import { forumDocumentsQuerySchema } from "../../validators/forum.validator";

const downloadQuerySchema = z.object({
  download: z.enum(["true"]).optional().openapi({
    description: "When true, includes presigned downloadUrl in response",
  }),
});

export function registerForumPaths(): void {
  registry.registerPath({
    method: "get",
    path: "/api/forum/documents",
    tags: ["Forum", "Internal Library"],
    summary: "List internal forum feed documents",
    description:
      "Browsable feed of internal documents scoped to the current user's academic profile. Exact curriculum matches are ranked before same-subject documents from other semesters.",
    security: [...bearerSecurity],
    request: {
      query: forumDocumentsQuerySchema,
    },
    responses: {
      200: jsonResponse(forumDocumentsSuccessResponseSchema, "Forum feed"),
      401: error401,
      403: error403,
    },
  });

  registry.registerPath({
    method: "get",
    path: "/api/forum/documents/{id}",
    tags: ["Forum", "Internal Library"],
    summary: "Get a forum document",
    security: [...bearerSecurity],
    request: {
      params: objectIdParamSchema,
      query: downloadQuerySchema,
    },
    responses: {
      200: jsonResponse(forumDocumentSuccessResponseSchema, "Forum document"),
      401: error401,
      403: error403,
      404: error404,
    },
  });
}
