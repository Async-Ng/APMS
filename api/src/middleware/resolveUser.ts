import type { NextFunction, Request, Response } from "express";

import { AppError } from "../errors/AppError";
import { syncUserFromAuth } from "../services/auth.service";

export async function resolveUser(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.authUser) {
      throw new AppError("Unauthorized", 401);
    }

    req.currentUser = await syncUserFromAuth(req.authUser);
    next();
  } catch (error) {
    next(error);
  }
}
