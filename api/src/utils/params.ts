import type { Request } from "express";

import { createAppError, ErrorCode } from "../errors/error-codes";

export function getRouteParam(req: Request, key: string): string {
  const value = req.params[key];

  if (typeof value !== "string") {
    throw createAppError(ErrorCode.VALIDATION_ERROR, 400, {
      technicalDetail: `Missing route parameter: ${key}`,
    });
  }

  return value;
}
