import type { NextFunction, Request, Response } from "express";

import { createAppError, ErrorCode } from "../errors/error-codes";

export function requireActiveUser(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (!req.currentUser) {
    next(createAppError(ErrorCode.AUTH_UNAUTHORIZED, 401));
    return;
  }

  if (req.currentUser.isDisabled) {
    next(createAppError(ErrorCode.AUTH_DISABLED, 403));
    return;
  }

  next();
}
