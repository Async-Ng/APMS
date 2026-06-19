import { Router } from "express";

import * as invitesController from "../controllers/invites.controller";
import { authenticate } from "../middleware/authenticate";
import { requireActiveUser } from "../middleware/requireActiveUser";
import { resolveUser } from "../middleware/resolveUser";
import { validate } from "../middleware/validate";
import { inviteTokenParamSchema } from "../validators/invite.validator";

const invitesRouter = Router();

invitesRouter.get(
  "/:token",
  validate({ params: inviteTokenParamSchema }),
  invitesController.getInvitePreview,
);

invitesRouter.post(
  "/:token/accept",
  validate({ params: inviteTokenParamSchema }),
  authenticate,
  resolveUser,
  requireActiveUser,
  invitesController.acceptInvite,
);

export { invitesRouter };
