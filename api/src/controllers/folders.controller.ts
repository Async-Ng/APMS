import type { Request, Response } from "express";

import { AppError } from "../errors/AppError";
import * as folderService from "../services/folder.service";
import { sendSuccess } from "../utils/apiResponse";
import { catchAsync } from "../utils/catchAsync";
import { getRouteParam } from "../utils/params";

function requireUser(req: Request) {
  if (!req.currentUser) {
    throw new AppError("Unauthorized", 401);
  }
  return req.currentUser;
}

export const createFolder = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const data = await folderService.createFolder(requireUser(req), req.body);
  sendSuccess(res, data, 201);
});

export const getFolder = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const data = await folderService.getFolder(requireUser(req), getRouteParam(req, "id"));
  sendSuccess(res, data);
});

export const updateFolder = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const data = await folderService.updateFolder(
    requireUser(req),
    getRouteParam(req, "id"),
    req.body,
  );
  sendSuccess(res, data);
});

export const deleteFolder = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const data = await folderService.deleteFolder(requireUser(req), getRouteParam(req, "id"));
  sendSuccess(res, data);
});

export const restoreFolder = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const data = await folderService.restoreFolder(requireUser(req), getRouteParam(req, "id"));
  sendSuccess(res, data);
});

export const starFolder = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const data = await folderService.setFolderStarred(
    requireUser(req),
    getRouteParam(req, "id"),
    true,
  );
  sendSuccess(res, data);
});

export const unstarFolder = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const data = await folderService.setFolderStarred(
    requireUser(req),
    getRouteParam(req, "id"),
    false,
  );
  sendSuccess(res, data);
});
