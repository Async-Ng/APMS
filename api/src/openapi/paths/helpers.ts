import type { ResponseConfig } from "@asteasolutions/zod-to-openapi";
import type { ZodType } from "zod";

import { errorResponseSchema } from "../schemas/common";

export function jsonResponse(
  schema: ZodType,
  description: string,
): ResponseConfig {
  return {
    description,
    content: {
      "application/json": {
        schema,
      },
    },
  };
}

export const error401: ResponseConfig = jsonResponse(errorResponseSchema, "Unauthorized");
export const error403: ResponseConfig = jsonResponse(errorResponseSchema, "Forbidden");
export const error404: ResponseConfig = jsonResponse(errorResponseSchema, "Not found");
export const error409: ResponseConfig = jsonResponse(errorResponseSchema, "Conflict");

export function error400(description = "Bad request"): ResponseConfig {
  return jsonResponse(errorResponseSchema, description);
}

export const bearerSecurity = [{ bearerAuth: [] as string[] }];
