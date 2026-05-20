import type { NextFunction, Request, Response } from "express";

import { AppError } from "../errors/AppError";

export function requireActiveUser(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (!req.currentUser) {
    next(new AppError("Unauthorized", 401));
    return;
  }

  if (req.currentUser.isDisabled) {
    next(new AppError("Account disabled", 403));
    return;
  }

  next();
}
