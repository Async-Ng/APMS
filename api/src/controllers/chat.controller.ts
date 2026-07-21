import type { Request, Response } from "express";

import { unauthorizedError } from "../errors/unauthorized";
import * as chatService from "../services/chat.service";
import type { ChatMode } from "../services/ai/chat-prompts";
import { sendSuccess } from "../utils/apiResponse";
import { catchAsync } from "../utils/catchAsync";
import { getRouteParam } from "../utils/params";

function requireUser(req: Request) {
  if (!req.currentUser) {
    throw unauthorizedError();
  }
  return req.currentUser;
}

export const createSession = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const data = await chatService.createSession(requireUser(req), req.body);
  sendSuccess(res, data, 201);
});

export const listSessions = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const data = await chatService.listSessions(requireUser(req));
  sendSuccess(res, data);
});

export const getSession = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const data = await chatService.getSession(requireUser(req), getRouteParam(req, "id"));
  sendSuccess(res, data);
});

export const updateSession = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const data = await chatService.updateSession(
    requireUser(req),
    getRouteParam(req, "id"),
    req.body,
  );
  sendSuccess(res, data);
});

export const deleteSession = catchAsync(async (req: Request, res: Response): Promise<void> => {
  await chatService.deleteSession(requireUser(req), getRouteParam(req, "id"));
  res.status(204).send();
});

export const sendMessage = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const debug = req.get("x-apms-ai-debug") === "1";
  const data = await chatService.sendMessage(
    requireUser(req),
    getRouteParam(req, "id"),
    req.body.content as string,
    (req.body.mode as ChatMode | undefined) ?? "chat",
    { debug },
  );
  sendSuccess(res, data, 201);
});

export const sendMessageStream = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const debug = req.get("x-apms-ai-debug") === "1";
  await chatService.sendMessageStream(
    requireUser(req),
    getRouteParam(req, "id"),
    req.body.content as string,
    (req.body.mode as ChatMode | undefined) ?? "chat",
    res,
    { debug },
  );
});

export const regenerateLastMessageStream = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const debug = req.get("x-apms-ai-debug") === "1";
    await chatService.regenerateLastMessageStream(
      requireUser(req),
      getRouteParam(req, "id"),
      res,
      { debug },
    );
  },
);

export const editMessageStream = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const debug = req.get("x-apms-ai-debug") === "1";
  await chatService.editMessageStream(
    requireUser(req),
    getRouteParam(req, "id"),
    getRouteParam(req, "messageId"),
    req.body.content as string,
    res,
    { debug },
  );
});
