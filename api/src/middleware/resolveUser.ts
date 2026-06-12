import type { NextFunction, Request, Response } from "express";

import { createAppError, ErrorCode } from "../errors/error-codes";
import { syncUserFromAuth } from "../services/auth.service";

export async function resolveUser(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.authUser) {
      throw createAppError(ErrorCode.AUTH_UNAUTHORIZED, 401);
    }

    req.currentUser = await syncUserFromAuth(req.authUser);
    next();
  } catch (error) {
    next(error);
  }
}
