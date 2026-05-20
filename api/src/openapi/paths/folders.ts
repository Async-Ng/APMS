import { objectIdParamSchema } from "../../validators/common.validator";
import { createFolderSchema, updateFolderSchema } from "../../validators/folder.validator";
import { registry } from "../setup";
import { folderSuccessResponseSchema } from "../schemas/folder";
import {
  bearerSecurity,
  error400,
  error401,
  error403,
  error404,
  error409,
  jsonResponse,
} from "./helpers";

const idParams = objectIdParamSchema;

export function registerFoldersPaths(): void {
  registry.registerPath({
    method: "post",
    path: "/api/folders",
    tags: ["Folders"],
    summary: "Create folder",
    security: [...bearerSecurity],
    request: {
      body: {
        content: {
          "application/json": {
            schema: createFolderSchema,
          },
        },
      },
    },
    responses: {
      201: jsonResponse(folderSuccessResponseSchema, "Created folder"),
      400: error400("Validation error"),
      401: error401,
      403: error403,
      409: error409,
    },
  });

  registry.registerPath({
    method: "get",
    path: "/api/folders/{id}",
    tags: ["Folders"],
    summary: "Get folder by id",
    security: [...bearerSecurity],
    request: { params: idParams },
    responses: {
      200: jsonResponse(folderSuccessResponseSchema, "Folder"),
      401: error401,
      403: error403,
      404: error404,
    },
  });

  registry.registerPath({
    method: "patch",
    path: "/api/folders/{id}",
    tags: ["Folders"],
    summary: "Update folder",
    security: [...bearerSecurity],
    request: {
      params: idParams,
      body: {
        content: {
          "application/json": {
            schema: updateFolderSchema,
          },
        },
      },
    },
    responses: {
      200: jsonResponse(folderSuccessResponseSchema, "Updated folder"),
      400: error400("Validation error or cycle detected"),
      401: error401,
      403: error403,
      404: error404,
      409: error409,
    },
  });

  registry.registerPath({
    method: "delete",
    path: "/api/folders/{id}",
    tags: ["Folders"],
    summary: "Soft delete folder",
    description: "Cascade soft-deletes subfolders and documents.",
    security: [...bearerSecurity],
    request: { params: idParams },
    responses: {
      200: jsonResponse(folderSuccessResponseSchema, "Deleted folder"),
      401: error401,
      403: error403,
      404: error404,
    },
  });

  registry.registerPath({
    method: "post",
    path: "/api/folders/{id}/restore",
    tags: ["Folders"],
    summary: "Restore folder from trash",
    security: [...bearerSecurity],
    request: { params: idParams },
    responses: {
      200: jsonResponse(folderSuccessResponseSchema, "Restored folder"),
      400: error400("Not in trash or parent still in trash"),
      401: error401,
      403: error403,
      404: error404,
      409: error409,
    },
  });

  registry.registerPath({
    method: "patch",
    path: "/api/folders/{id}/star",
    tags: ["Folders"],
    summary: "Star folder",
    security: [...bearerSecurity],
    request: { params: idParams },
    responses: {
      200: jsonResponse(folderSuccessResponseSchema, "Starred folder"),
      401: error401,
      403: error403,
      404: error404,
    },
  });

  registry.registerPath({
    method: "delete",
    path: "/api/folders/{id}/star",
    tags: ["Folders"],
    summary: "Unstar folder",
    security: [...bearerSecurity],
    request: { params: idParams },
    responses: {
      200: jsonResponse(folderSuccessResponseSchema, "Unstarred folder"),
      401: error401,
      403: error403,
      404: error404,
    },
  });
}
