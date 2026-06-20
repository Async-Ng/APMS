import { Router } from "express";

import * as academicController from "../controllers/academic.controller";
import { authenticate } from "../middleware/authenticate";
import { requireActiveUser } from "../middleware/requireActiveUser";
import { resolveUser } from "../middleware/resolveUser";
import { validate } from "../middleware/validate";
import { objectIdParamSchema } from "../validators/common.validator";
import { listLibraryDocumentsQuerySchema } from "../validators/academic.validator";

const libraryRouter = Router();
libraryRouter.use(authenticate, resolveUser, requireActiveUser);

libraryRouter.get(
  "/documents",
  validate({ query: listLibraryDocumentsQuerySchema }),
  academicController.listLibraryDocuments,
);
libraryRouter.get(
  "/documents/:id",
  validate({ params: objectIdParamSchema }),
  academicController.getLibraryDocument,
);

export { libraryRouter };
