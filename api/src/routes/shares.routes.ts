import { Router } from "express";

import * as sharesController from "../controllers/shares.controller";
import { authenticate } from "../middleware/authenticate";
import { requireActiveUser } from "../middleware/requireActiveUser";
import { resolveUser } from "../middleware/resolveUser";
import { validate } from "../middleware/validate";
import { objectIdParamSchema } from "../validators/common.validator";
import { createShareSchema } from "../validators/share.validator";

const sharesRouter = Router();

sharesRouter.use(authenticate, resolveUser, requireActiveUser);

sharesRouter.post("/", validate({ body: createShareSchema }), sharesController.createShares);
sharesRouter.delete(
  "/:id",
  validate({ params: objectIdParamSchema }),
  sharesController.revokeShare,
);
sharesRouter.get("/with-me", sharesController.listSharedWithMe);
sharesRouter.get("/by-me", sharesController.listSharedByMe);

export { sharesRouter };
