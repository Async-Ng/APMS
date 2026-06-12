import type { Request, Response } from "express";

import { unauthorizedError } from "../errors/unauthorized";
import * as userService from "../services/user.service";
import { sendSuccess } from "../utils/apiResponse";
import { catchAsync } from "../utils/catchAsync";

export const updateMe = catchAsync(async (req: Request, res: Response): Promise<void> => {
  if (!req.currentUser) {
    throw unauthorizedError();
  }

  const data = await userService.updateProfile(req.currentUser, req.body.displayName);
  sendSuccess(res, data);
});

export const searchUsers = catchAsync(async (req: Request, res: Response): Promise<void> => {
  if (!req.currentUser) {
    throw unauthorizedError();
  }

  const emailRaw = typeof req.query.email === "string" ? req.query.email : undefined;
  const displayNameRaw = typeof req.query.displayName === "string" ? req.query.displayName : undefined;

  // Build query omitting undefined keys to satisfy exactOptionalPropertyTypes
  const query: { email?: string; displayName?: string } = {};
  if (emailRaw !== undefined) query.email = emailRaw;
  if (displayNameRaw !== undefined) query.displayName = displayNameRaw;

  const data = await userService.searchUsers(req.currentUser._id, query);
  sendSuccess(res, data);
});

