import { Router } from "express";
import { z } from "zod";

import * as academicController from "../controllers/academic.controller";
import { authenticate } from "../middleware/authenticate";
import { requireActiveUser } from "../middleware/requireActiveUser";
import { resolveUser } from "../middleware/resolveUser";
import { validate } from "../middleware/validate";
import { catalogCurriculumQuerySchema } from "../validators/academic.validator";

const catalogRouter = Router();
catalogRouter.use(authenticate, resolveUser, requireActiveUser);

catalogRouter.get("/majors", academicController.listCatalogMajors);
catalogRouter.get("/semesters", academicController.listCatalogSemesters);
catalogRouter.get(
  "/majors/:majorId/semesters",
  validate({
    params: z.object({ majorId: z.string().regex(/^[a-f\d]{24}$/i) }),
  }),
  academicController.listCatalogMajorSemesters,
);
catalogRouter.get(
  "/majors/:majorId/curriculum",
  validate({
    params: z.object({ majorId: z.string().regex(/^[a-f\d]{24}$/i) }),
    query: catalogCurriculumQuerySchema,
  }),
  academicController.listCatalogCurriculum,
);

export { catalogRouter };
