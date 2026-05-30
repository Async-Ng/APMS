import type { Request, Response } from "express";

import { AppError } from "../errors/AppError";
import * as searchService from "../services/search.service";
import { sendSuccess } from "../utils/apiResponse";
import { catchAsync } from "../utils/catchAsync";

export const search = catchAsync(async (req: Request, res: Response): Promise<void> => {
  if (!req.currentUser) {
    throw new AppError("Unauthorized", 401);
  }

  const { q, limit } = req.validatedQuery as { q: string; limit: number };

  const results = await searchService.semanticSearch(req.currentUser._id, q, limit);
  sendSuccess(res, { results });
});
