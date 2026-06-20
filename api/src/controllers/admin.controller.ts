import type { Request, Response } from "express";

import { unauthorizedError } from "../errors/unauthorized";
import * as adminService from "../services/admin.service";
import type {
  listAccessEmailsQuerySchema,
  listUsersQuerySchema,
} from "../validators/admin.validator";
import type { z } from "zod";
import { sendSuccess } from "../utils/apiResponse";
import { catchAsync } from "../utils/catchAsync";
import { getRouteParam } from "../utils/params";
import * as accessEmailService from "../services/access-email.service";

function requireUser(req: Request) {
  if (!req.currentUser) {
    throw unauthorizedError();
  }
  return req.currentUser;
}

export const listUsers = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const query = req.validatedQuery as z.infer<typeof listUsersQuerySchema>;
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

export const listAccessEmails = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const query = req.validatedQuery as z.infer<typeof listAccessEmailsQuerySchema>;
    const options: {
      page: number;
      limit: number;
      status: "active" | "inactive" | "all";
      search?: string;
    } = {
      page: query.page,
      limit: query.limit,
      status: query.status,
    };
    if (query.search !== undefined) options.search = query.search;
    sendSuccess(res, await accessEmailService.listAccessEmails(options));
  },
);

export const bulkCreateAccessEmails = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const data = await accessEmailService.bulkUpsertAccessEmails(
      requireUser(req),
      req.body.entries,
    );
    sendSuccess(res, data);
  },
);

export const updateAccessEmail = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const data = await accessEmailService.updateAccessEmail(
      requireUser(req),
      getRouteParam(req, "id"),
      req.body,
    );
    sendSuccess(res, data);
  },
);

export const deactivateAccessEmail = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const data = await accessEmailService.deactivateAccessEmail(
      requireUser(req),
      getRouteParam(req, "id"),
    );
    sendSuccess(res, data);
  },
);
