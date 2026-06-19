import type { Request, Response } from "express";

import { unauthorizedError } from "../errors/unauthorized";
import * as inviteService from "../services/invite.service";
import { sendSuccess } from "../utils/apiResponse";
import { catchAsync } from "../utils/catchAsync";
import { getRouteParam } from "../utils/params";

function requireUser(req: Request) {
  if (!req.currentUser) {
    throw unauthorizedError();
  }
  return req.currentUser;
}

export const getInvitePreview = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const data = await inviteService.getInvitePreview(getRouteParam(req, "token"));
  sendSuccess(res, data);
});

export const acceptInvite = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const data = await inviteService.acceptInvite(getRouteParam(req, "token"), requireUser(req));
  sendSuccess(res, data);
});
