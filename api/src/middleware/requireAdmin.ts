import type { NextFunction, Request, Response } from "express";

import { AppError } from "../errors/AppError";

export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.currentUser) {
    next(new AppError("Unauthorized", 401));
    return;
  }

  if (req.currentUser.role !== "admin") {
    next(new AppError("Admin access required", 403));
    return;
  }

  next();
}
