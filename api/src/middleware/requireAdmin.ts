import type { NextFunction, Request, Response } from "express";

import { createAppError, ErrorCode } from "../errors/error-codes";

export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.currentUser) {
    next(createAppError(ErrorCode.AUTH_UNAUTHORIZED, 401));
    return;
  }

  if (req.currentUser.role !== "admin") {
    next(createAppError(ErrorCode.FORBIDDEN, 403, { technicalDetail: "Admin role required" }));
    return;
  }

  next();
}
