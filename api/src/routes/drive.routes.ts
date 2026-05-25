import { Router } from "express";

import * as driveController from "../controllers/drive.controller";
import { authenticate } from "../middleware/authenticate";
import { requireActiveUser } from "../middleware/requireActiveUser";
import { resolveUser } from "../middleware/resolveUser";
import { validate } from "../middleware/validate";
import { optionalParentIdQuerySchema } from "../validators/common.validator";

const driveRouter = Router();

driveRouter.use(authenticate, resolveUser, requireActiveUser);

driveRouter.get("/starred", driveController.listStarred);
driveRouter.get("/trash", driveController.listTrash);
driveRouter.get("/shared", driveController.listSharedWithMe);
driveRouter.get("/", validate({ query: optionalParentIdQuerySchema }), driveController.listDrive);

export { driveRouter };
