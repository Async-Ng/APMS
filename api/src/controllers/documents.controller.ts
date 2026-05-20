import type { Request, Response } from "express";

import { AppError } from "../errors/AppError";
import * as documentService from "../services/document.service";
import { sendSuccess } from "../utils/apiResponse";
import { catchAsync } from "../utils/catchAsync";
import { getRouteParam } from "../utils/params";

function requireUser(req: Request) {
  if (!req.currentUser) {
    throw new AppError("Unauthorized", 401);
  }
  return req.currentUser;
}

export const createUploadIntent = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const data = await documentService.createUploadIntent(requireUser(req), req.body);
    sendSuccess(res, data, 201);
  },
);

export const completeUpload = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const data = await documentService.completeUpload(requireUser(req), getRouteParam(req, "id"));
  sendSuccess(res, data);
});

export const getDocument = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const includeDownloadUrl = req.query.download === "true";
  const data = await documentService.getDocument(requireUser(req), getRouteParam(req, "id"), {
    includeDownloadUrl,
  });
  sendSuccess(res, data);
});

export const updateDocument = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const data = await documentService.updateDocument(
    requireUser(req),
    getRouteParam(req, "id"),
    req.body,
  );
  sendSuccess(res, data);
});

export const deleteDocument = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const data = await documentService.deleteDocument(requireUser(req), getRouteParam(req, "id"));
  sendSuccess(res, data);
});

export const restoreDocument = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const data = await documentService.restoreDocument(
    requireUser(req),
    getRouteParam(req, "id"),
  );
  sendSuccess(res, data);
});

export const starDocument = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const data = await documentService.setDocumentStarred(
    requireUser(req),
    getRouteParam(req, "id"),
    true,
  );
  sendSuccess(res, data);
});

export const unstarDocument = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const data = await documentService.setDocumentStarred(
    requireUser(req),
    getRouteParam(req, "id"),
    false,
  );
  sendSuccess(res, data);
});
