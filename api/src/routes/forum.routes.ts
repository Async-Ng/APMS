import { Router } from "express";
import { z } from "zod";

import * as forumController from "../controllers/forum.controller";
import { authenticate } from "../middleware/authenticate";
import { requireActiveUser } from "../middleware/requireActiveUser";
import { resolveUser } from "../middleware/resolveUser";
import { validate } from "../middleware/validate";
import { objectIdParamSchema } from "../validators/common.validator";
import { forumDocumentsQuerySchema } from "../validators/forum.validator";

const downloadQuerySchema = z.object({
  download: z.enum(["true"]).optional(),
});

const forumRouter = Router();

forumRouter.use(authenticate, resolveUser, requireActiveUser);

forumRouter.get(
  "/documents",
  validate({ query: forumDocumentsQuerySchema }),
  forumController.listDocuments,
);
forumRouter.get(
  "/documents/:id",
  validate({ params: objectIdParamSchema, query: downloadQuerySchema }),
  forumController.getDocument,
);

export { forumRouter };
