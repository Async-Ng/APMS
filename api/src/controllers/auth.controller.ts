import type { Request, Response } from "express";

import { toUserResponse } from "../services/auth.service";
import { sendSuccess } from "../utils/apiResponse";
import { catchAsync } from "../utils/catchAsync";

export const getMe = catchAsync(async (req: Request, res: Response): Promise<void> => {
  if (!req.currentUser) {
    res.status(401).json({ status: "error", message: "Unauthorized" });
    return;
  }

  sendSuccess(res, toUserResponse(req.currentUser));
});
