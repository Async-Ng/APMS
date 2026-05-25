import type { Request, Response } from "express";

import { AppError } from "../errors/AppError";
import * as driveService from "../services/drive.service";
import { sendSuccess } from "../utils/apiResponse";
import { catchAsync } from "../utils/catchAsync";

function requireUser(req: Request) {
  if (!req.currentUser) {
    throw new AppError("Unauthorized", 401);
  }
  return req.currentUser;
}

export const listDrive = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const parentId =
    typeof req.validatedQuery?.parentId === "string" ? req.validatedQuery.parentId : undefined;
  const data = await driveService.listDriveContents(requireUser(req), parentId);
  sendSuccess(res, data);
});

export const listStarred = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const data = await driveService.listStarred(requireUser(req));
  sendSuccess(res, data);
});

export const listTrash = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const data = await driveService.listTrash(requireUser(req));
  sendSuccess(res, data);
});

export const listSharedWithMe = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const data = await driveService.listSharedWithMe(requireUser(req));
  sendSuccess(res, data);
});

