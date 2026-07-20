import { Router } from "express";

import {
  createSession,
  deleteSession,
  editMessageStream,
  getSession,
  listSessions,
  regenerateLastMessageStream,
  sendMessage,
  sendMessageStream,
  updateSession,
} from "../controllers/chat.controller";
import { authenticate } from "../middleware/authenticate";
import { requireActiveUser } from "../middleware/requireActiveUser";
import { resolveUser } from "../middleware/resolveUser";
import { validate } from "../middleware/validate";
import { objectIdParamSchema } from "../validators/common.validator";
import {
  createSessionSchema,
  editMessageParamsSchema,
  editMessageSchema,
  sendMessageSchema,
  updateSessionSchema,
} from "../validators/chat.validator";

const chatRouter = Router();

chatRouter.use(authenticate, resolveUser, requireActiveUser);

chatRouter.post("/sessions", validate({ body: createSessionSchema }), createSession);
chatRouter.get("/sessions", listSessions);
chatRouter.get("/sessions/:id", validate({ params: objectIdParamSchema }), getSession);
chatRouter.patch(
  "/sessions/:id",
  validate({ params: objectIdParamSchema, body: updateSessionSchema }),
  updateSession,
);
chatRouter.delete("/sessions/:id", validate({ params: objectIdParamSchema }), deleteSession);
chatRouter.post(
  "/sessions/:id/messages",
  validate({ params: objectIdParamSchema, body: sendMessageSchema }),
  sendMessage,
);
chatRouter.post(
  "/sessions/:id/messages/stream",
  validate({ params: objectIdParamSchema, body: sendMessageSchema }),
  sendMessageStream,
);
chatRouter.post(
  "/sessions/:id/regenerate/stream",
  validate({ params: objectIdParamSchema }),
  regenerateLastMessageStream,
);
chatRouter.post(
  "/sessions/:id/messages/:messageId/edit/stream",
  validate({ params: editMessageParamsSchema, body: editMessageSchema }),
  editMessageStream,
);

export { chatRouter };
