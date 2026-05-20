import { Router } from "express";

import * as adminController from "../controllers/admin.controller";
import { authenticate } from "../middleware/authenticate";
import { requireActiveUser } from "../middleware/requireActiveUser";
import { requireAdmin } from "../middleware/requireAdmin";
import { resolveUser } from "../middleware/resolveUser";
import { validate } from "../middleware/validate";
import { objectIdParamSchema } from "../validators/common.validator";
import { listUsersQuerySchema, updateAdminUserSchema } from "../validators/admin.validator";

const adminRouter = Router();

adminRouter.use(authenticate, resolveUser, requireActiveUser, requireAdmin);

adminRouter.get("/stats", adminController.getStats);
adminRouter.get("/users", validate({ query: listUsersQuerySchema }), adminController.listUsers);
adminRouter.get(
  "/users/:id",
  validate({ params: objectIdParamSchema }),
  adminController.getUser,
);
adminRouter.patch(
  "/users/:id",
  validate({ params: objectIdParamSchema, body: updateAdminUserSchema }),
  adminController.updateUser,
);

export { adminRouter };
