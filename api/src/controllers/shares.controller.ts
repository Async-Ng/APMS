import type { Request, Response } from "express";

import { AppError } from "../errors/AppError";
import * as shareService from "../services/share.service";
import { sendSuccess } from "../utils/apiResponse";
import { catchAsync } from "../utils/catchAsync";
import { getRouteParam } from "../utils/params";

function requireUser(req: Request) {
  if (!req.currentUser) {
    throw new AppError("Unauthorized", 401);
  }
  return req.currentUser;
}

export const createShares = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const data = await shareService.createShares(requireUser(req), req.body);
  sendSuccess(res, data, 201);
});

export const revokeShare = catchAsync(async (req: Request, res: Response): Promise<void> => {
  await shareService.revokeShare(requireUser(req), getRouteParam(req, "id"));
  sendSuccess(res, null, 204);
});

export const listSharedWithMe = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const data = await shareService.listSharedWithMe(requireUser(req));
  sendSuccess(res, data);
});

export const listSharedByMe = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const data = await shareService.listSharedByMe(requireUser(req));
  sendSuccess(res, data);
});
