import { Router } from "express";

import * as foldersController from "../controllers/folders.controller";
import { authenticate } from "../middleware/authenticate";
import { resolveUser } from "../middleware/resolveUser";
import { validate } from "../middleware/validate";
import { objectIdParamSchema } from "../validators/common.validator";
import { createFolderSchema, updateFolderSchema } from "../validators/folder.validator";

const foldersRouter = Router();

foldersRouter.use(authenticate, resolveUser);

foldersRouter.post("/", validate({ body: createFolderSchema }), foldersController.createFolder);
foldersRouter.get("/:id", validate({ params: objectIdParamSchema }), foldersController.getFolder);
foldersRouter.patch(
  "/:id",
  validate({ params: objectIdParamSchema, body: updateFolderSchema }),
  foldersController.updateFolder,
);
foldersRouter.delete(
  "/:id",
  validate({ params: objectIdParamSchema }),
  foldersController.deleteFolder,
);
foldersRouter.post(
  "/:id/restore",
  validate({ params: objectIdParamSchema }),
  foldersController.restoreFolder,
);
foldersRouter.patch(
  "/:id/star",
  validate({ params: objectIdParamSchema }),
  foldersController.starFolder,
);
foldersRouter.delete(
  "/:id/star",
  validate({ params: objectIdParamSchema }),
  foldersController.unstarFolder,
);

export { foldersRouter };
