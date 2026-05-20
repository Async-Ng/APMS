import { Router } from "express";

import { updateMe } from "../controllers/users.controller";
import { authenticate } from "../middleware/authenticate";
import { requireActiveUser } from "../middleware/requireActiveUser";
import { resolveUser } from "../middleware/resolveUser";
import { validate } from "../middleware/validate";
import { updateUserSchema } from "../validators/user.validator";

const usersRouter = Router();

usersRouter.patch(
  "/me",
  authenticate,
  resolveUser,
  requireActiveUser,
  validate({ body: updateUserSchema }),
  updateMe,
);

export { usersRouter };
