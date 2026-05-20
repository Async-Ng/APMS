import type { Request, Response } from "express";

import { AppError } from "../errors/AppError";
import * as userService from "../services/user.service";
import { sendSuccess } from "../utils/apiResponse";
import { catchAsync } from "../utils/catchAsync";

export const updateMe = catchAsync(async (req: Request, res: Response): Promise<void> => {
  if (!req.currentUser) {
    throw new AppError("Unauthorized", 401);
  }

  const data = await userService.updateProfile(req.currentUser, req.body.displayName);
  sendSuccess(res, data);
});
