import type { Request } from "express";

import { AppError } from "../errors/AppError";

export function getRouteParam(req: Request, key: string): string {
  const value = req.params[key];

  if (typeof value !== "string") {
    throw new AppError(`Missing route parameter: ${key}`, 400);
  }

  return value;
}
