import { Router } from "express";
import { z } from "zod";

import * as academicController from "../controllers/academic.controller";
import { authenticate } from "../middleware/authenticate";
import { requireActiveUser } from "../middleware/requireActiveUser";
import { resolveUser } from "../middleware/resolveUser";
import { validate } from "../middleware/validate";
import { catalogCourseSlotsQuerySchema } from "../validators/academic.validator";

const catalogRouter = Router();
catalogRouter.use(authenticate, resolveUser, requireActiveUser);

catalogRouter.get("/curricula", academicController.listCatalogCurricula);
catalogRouter.get("/semesters", academicController.listCatalogSemesters);
catalogRouter.get(
  "/curricula/:curriculumId/semesters",
  validate({
    params: z.object({ curriculumId: z.string().regex(/^[a-f\d]{24}$/i) }),
  }),
  academicController.listCatalogCurriculumSemesters,
);
catalogRouter.get(
  "/curricula/:curriculumId/course-slots",
  validate({
    params: z.object({ curriculumId: z.string().regex(/^[a-f\d]{24}$/i) }),
    query: catalogCourseSlotsQuerySchema,
  }),
  academicController.listCatalogCourseSlots,
);

export { catalogRouter };
