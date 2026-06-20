import { Router } from "express";

import * as academicController from "../controllers/academic.controller";
import { searchUsers, updateMe } from "../controllers/users.controller";
import { authenticate } from "../middleware/authenticate";
import { requireActiveUser } from "../middleware/requireActiveUser";
import { resolveUser } from "../middleware/resolveUser";
import { validate } from "../middleware/validate";
import { updateUserSchema } from "../validators/user.validator";
import { updateAcademicProfileSchema } from "../validators/academic.validator";
import { userSearchQuerySchema } from "../validators/share.validator";

const usersRouter = Router();

usersRouter.get(
  "/me/academic-profile",
  authenticate,
  resolveUser,
  requireActiveUser,
  academicController.getAcademicProfile,
);

usersRouter.patch(
  "/me/academic-profile",
  authenticate,
  resolveUser,
  requireActiveUser,
  validate({ body: updateAcademicProfileSchema }),
  academicController.updateAcademicProfile,
);

usersRouter.patch(
  "/me",
  authenticate,
  resolveUser,
  requireActiveUser,
  validate({ body: updateUserSchema }),
  updateMe,
);

// Public-safe user search for share recipient lookup
usersRouter.get(
  "/search",
  authenticate,
  resolveUser,
  requireActiveUser,
  validate({ query: userSearchQuerySchema }),
  searchUsers,
);

export { usersRouter };
