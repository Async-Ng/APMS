import { optionalParentIdQuerySchema } from "../../validators/common.validator";
import { registry, z } from "../setup";
import { driveContentsSuccessResponseSchema } from "../schemas/drive";
import { successEnvelope } from "../schemas/common";
import { bearerSecurity, error401, error403, error404, jsonResponse } from "./helpers";

export function registerDrivePaths(): void {
  registry.registerPath({
    method: "get",
    path: "/api/drive",
    tags: ["Drive"],
    summary: "List drive contents",
    description: "My Drive root when parentId is omitted, or contents of a folder.",
    security: [...bearerSecurity],
    request: {
      query: optionalParentIdQuerySchema,
    },
    responses: {
      200: jsonResponse(driveContentsSuccessResponseSchema, "Folders and documents"),
      401: error401,
      403: error403,
      404: error404,
    },
  });

  registry.registerPath({
    method: "get",
    path: "/api/drive/starred",
    tags: ["Drive"],
    summary: "List starred items",
    security: [...bearerSecurity],
    responses: {
      200: jsonResponse(driveContentsSuccessResponseSchema, "Starred folders and documents"),
      401: error401,
      403: error403,
    },
  });

  registry.registerPath({
    method: "get",
    path: "/api/drive/trash",
    tags: ["Drive"],
    summary: "List trash items",
    security: [...bearerSecurity],
    responses: {
      200: jsonResponse(driveContentsSuccessResponseSchema, "Trashed folders and documents"),
      401: error401,
      403: error403,
    },
  });

  registry.registerPath({
    method: "get",
    path: "/api/drive/shared",
    tags: ["Drive", "Shares"],
    summary: "List items shared with me (Drive view)",
    description: "Drive-style view of all folders and documents shared with the current user.",
    security: [...bearerSecurity],
    responses: {
      200: jsonResponse(
        successEnvelope(
          registry.register(
            "DriveSharedContents",
            z
              .object({
                folders: z.array(z.record(z.string(), z.unknown())),
                documents: z.array(z.record(z.string(), z.unknown())),
              })
              .openapi("DriveSharedContents"),
          ),
          "DriveSharedContents",
        ),
        "Shared folders and documents",
      ),
      401: error401,
      403: error403,
    },
  });
}
