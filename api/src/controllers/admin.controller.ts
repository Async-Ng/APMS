import type { Request, Response } from "express";

import { AppError } from "../errors/AppError";
import * as adminService from "../services/admin.service";
import type { listUsersQuerySchema } from "../validators/admin.validator";
import type { z } from "zod";
import { sendSuccess } from "../utils/apiResponse";
import { catchAsync } from "../utils/catchAsync";
import { getRouteParam } from "../utils/params";

function requireUser(req: Request) {
  if (!req.currentUser) {
    throw new AppError("Unauthorized", 401);
  }
  return req.currentUser;
}

export const listUsers = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const query = req.query as unknown as z.infer<typeof listUsersQuerySchema>;
  const options: { page: number; limit: number; search?: string } = {
    page: query.page,
    limit: query.limit,
  };
  if (query.search !== undefined) {
    options.search = query.search;
  }
  const data = await adminService.listUsers(options);
  sendSuccess(res, data);
});

export const getUser = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const data = await adminService.getUserById(getRouteParam(req, "id"));
  sendSuccess(res, data);
});

export const updateUser = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const data = await adminService.updateUser(
    requireUser(req),
    getRouteParam(req, "id"),
    req.body,
  );
  sendSuccess(res, data);
});

export const getStats = catchAsync(async (_req: Request, res: Response): Promise<void> => {
  const data = await adminService.getSystemStats();
  sendSuccess(res, data);
});
