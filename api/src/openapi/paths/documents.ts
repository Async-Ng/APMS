import { z } from "zod";
import { objectIdParamSchema } from "../../validators/common.validator";
import {
  createUploadIntentSchema,
  updateDocumentSchema,
} from "../../validators/document.validator";
import { registry } from "../setup";
import {
  documentSuccessResponseSchema,
  uploadIntentSuccessResponseSchema,
} from "../schemas/document";
import { permanentDeleteSuccessResponseSchema } from "../schemas/common";
import {
  bearerSecurity,
  error400,
  error401,
  error403,
  error404,
  jsonResponse,
} from "./helpers";

const idParams = objectIdParamSchema;

const downloadQuerySchema = z.object({
  download: z.enum(["true"]).optional().openapi({
    description: "When true, includes presigned downloadUrl in response",
  }),
});

export function registerDocumentsPaths(): void {
  registry.registerPath({
    method: "post",
    path: "/api/documents/upload-intents",
    tags: ["Documents"],
    summary: "Create upload intent",
    description: "Creates pending document and returns presigned S3 PUT URL.",
    security: [...bearerSecurity],
    request: {
      body: {
        content: {
          "application/json": {
            schema: createUploadIntentSchema,
          },
        },
      },
    },
    responses: {
      201: jsonResponse(uploadIntentSuccessResponseSchema, "Upload intent"),
      400: error400("Validation error or unsupported MIME"),
      401: error401,
      403: error403,
    },
  });

  registry.registerPath({
    method: "post",
    path: "/api/documents/{id}/complete",
    tags: ["Documents"],
    summary: "Complete document upload",
    description: "Verifies S3 object and sets status to processing.",
    security: [...bearerSecurity],
    request: { params: idParams },
    responses: {
      200: jsonResponse(documentSuccessResponseSchema, "Upload completed"),
      400: error400("Upload not pending or S3 verification failed"),
      401: error401,
      403: error403,
      404: error404,
    },
  });

  registry.registerPath({
    method: "get",
    path: "/api/documents/{id}",
    tags: ["Documents"],
    summary: "Get document metadata",
    security: [...bearerSecurity],
    request: {
      params: idParams,
      query: downloadQuerySchema,
    },
    responses: {
      200: jsonResponse(documentSuccessResponseSchema, "Document"),
      401: error401,
      403: error403,
      404: error404,
    },
  });

  registry.registerPath({
    method: "patch",
    path: "/api/documents/{id}",
    tags: ["Documents"],
    summary: "Update document metadata",
    security: [...bearerSecurity],
    request: {
      params: idParams,
      body: {
        content: {
          "application/json": {
            schema: updateDocumentSchema,
          },
        },
      },
    },
    responses: {
      200: jsonResponse(documentSuccessResponseSchema, "Updated document"),
      400: error400("Validation error"),
      401: error401,
      403: error403,
      404: error404,
    },
  });

  registry.registerPath({
    method: "delete",
    path: "/api/documents/{id}/permanent",
    tags: ["Documents"],
    summary: "Permanently delete document from trash",
    description:
      "Removes S3 object, vector chunks, shares, and DB record. Decrements storage quota for completed uploads.",
    security: [...bearerSecurity],
    request: { params: idParams },
    responses: {
      200: jsonResponse(permanentDeleteSuccessResponseSchema, "Permanently deleted"),
      400: error400("Document not in trash"),
      401: error401,
      403: error403,
      404: error404,
    },
  });

  registry.registerPath({
    method: "delete",
    path: "/api/documents/{id}",
    tags: ["Documents"],
    summary: "Soft delete document",
    security: [...bearerSecurity],
    request: { params: idParams },
    responses: {
      200: jsonResponse(documentSuccessResponseSchema, "Deleted document"),
      401: error401,
      403: error403,
      404: error404,
    },
  });

  registry.registerPath({
    method: "post",
    path: "/api/documents/{id}/restore",
    tags: ["Documents"],
    summary: "Restore document from trash",
    security: [...bearerSecurity],
    request: { params: idParams },
    responses: {
      200: jsonResponse(documentSuccessResponseSchema, "Restored document"),
      400: error400("Not in trash or parent folder in trash"),
      401: error401,
      403: error403,
      404: error404,
    },
  });

  registry.registerPath({
    method: "patch",
    path: "/api/documents/{id}/star",
    tags: ["Documents"],
    summary: "Star document",
    security: [...bearerSecurity],
    request: { params: idParams },
    responses: {
      200: jsonResponse(documentSuccessResponseSchema, "Starred document"),
      401: error401,
      403: error403,
      404: error404,
    },
  });

  registry.registerPath({
    method: "delete",
    path: "/api/documents/{id}/star",
    tags: ["Documents"],
    summary: "Unstar document",
    security: [...bearerSecurity],
    request: { params: idParams },
    responses: {
      200: jsonResponse(documentSuccessResponseSchema, "Unstarred document"),
      401: error401,
      403: error403,
      404: error404,
    },
  });
}
