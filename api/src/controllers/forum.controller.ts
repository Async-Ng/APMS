import type { Request, Response } from "express";
import type { z } from "zod";

import { unauthorizedError } from "../errors/unauthorized";
import * as forumService from "../services/forum.service";
import { sendSuccess } from "../utils/apiResponse";
import { catchAsync } from "../utils/catchAsync";
import { getRouteParam } from "../utils/params";
import { listLibraryDocumentsQuerySchema } from "../validators/academic.validator";

function requireUser(req: Request) {
  if (!req.currentUser) {
    throw unauthorizedError();
  }
  return req.currentUser;
}

export const listDocuments = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const query = req.validatedQuery as z.infer<typeof listLibraryDocumentsQuerySchema>;
  sendSuccess(res, await forumService.listForumDocuments(query));
});

export const getDocument = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const includeDownloadUrl = req.query.download === "true";
  const data = await forumService.getForumDocument(
    requireUser(req),
    getRouteParam(req, "id"),
    includeDownloadUrl,
  );
  sendSuccess(res, data);
});
