import type { NextFunction, Request, Response } from "express";

import { syncUserFromAuth, toUserResponse } from "../services/auth.service";

export async function getMe(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.authUser) {
      res.status(401).json({ status: "error", message: "Unauthorized" });
      return;
    }

    const user = await syncUserFromAuth(req.authUser);
    res.status(200).json({ status: "ok", data: toUserResponse(user) });
  } catch (error) {
    next(error);
  }
}
