import { Router } from "express";

import * as documentsController from "../controllers/documents.controller";
import { authenticate } from "../middleware/authenticate";
import { requireActiveUser } from "../middleware/requireActiveUser";
import { resolveUser } from "../middleware/resolveUser";
import { validate } from "../middleware/validate";
import { objectIdParamSchema } from "../validators/common.validator";
import {
  createUploadIntentSchema,
  updateDocumentSchema,
} from "../validators/document.validator";

const documentsRouter = Router();

documentsRouter.use(authenticate, resolveUser, requireActiveUser);

documentsRouter.post(
  "/upload-intents",
  validate({ body: createUploadIntentSchema }),
  documentsController.createUploadIntent,
);
documentsRouter.post(
  "/:id/complete",
  validate({ params: objectIdParamSchema }),
  documentsController.completeUpload,
);
documentsRouter.get(
  "/:id",
  validate({ params: objectIdParamSchema }),
  documentsController.getDocument,
);
documentsRouter.patch(
  "/:id",
  validate({ params: objectIdParamSchema, body: updateDocumentSchema }),
  documentsController.updateDocument,
);
documentsRouter.delete(
  "/:id/permanent",
  validate({ params: objectIdParamSchema }),
  documentsController.permanentlyDeleteDocument,
);
documentsRouter.delete(
  "/:id",
  validate({ params: objectIdParamSchema }),
  documentsController.deleteDocument,
);
documentsRouter.post(
  "/:id/restore",
  validate({ params: objectIdParamSchema }),
  documentsController.restoreDocument,
);
documentsRouter.patch(
  "/:id/star",
  validate({ params: objectIdParamSchema }),
  documentsController.starDocument,
);
documentsRouter.delete(
  "/:id/star",
  validate({ params: objectIdParamSchema }),
  documentsController.unstarDocument,
);

export { documentsRouter };
