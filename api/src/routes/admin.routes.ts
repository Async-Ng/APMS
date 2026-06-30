import { Router } from "express";
import { z } from "zod";

import * as adminController from "../controllers/admin.controller";
import * as academicController from "../controllers/academic.controller";
import { authenticate } from "../middleware/authenticate";
import { requireActiveUser } from "../middleware/requireActiveUser";
import { requireAdmin } from "../middleware/requireAdmin";
import { resolveUser } from "../middleware/resolveUser";
import { validate } from "../middleware/validate";
import { objectIdParamSchema } from "../validators/common.validator";
import {
  bulkAccessEmailsSchema,
  listAccessEmailsQuerySchema,
  listUsersQuerySchema,
  updateAccessEmailSchema,
  updateAdminUserSchema,
} from "../validators/admin.validator";
import {
  assignCurriculumSemestersSchema,
  createCourseSlotSchema,
  createCurriculumSchema,
  createSemesterSchema,
  createSubjectSchema,
  listCourseSlotsQuerySchema,
  updateCourseSlotSchema,
  updateCurriculumSchema,
  updateSemesterSchema,
  updateSubjectSchema,
} from "../validators/academic.validator";

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

adminRouter.get(
  "/access-emails",
  validate({ query: listAccessEmailsQuerySchema }),
  adminController.listAccessEmails,
);
adminRouter.post(
  "/access-emails/bulk",
  validate({ body: bulkAccessEmailsSchema }),
  adminController.bulkCreateAccessEmails,
);
adminRouter.patch(
  "/access-emails/:id",
  validate({ params: objectIdParamSchema, body: updateAccessEmailSchema }),
  adminController.updateAccessEmail,
);
adminRouter.delete(
  "/access-emails/:id",
  validate({ params: objectIdParamSchema }),
  adminController.deactivateAccessEmail,
);

adminRouter.get("/curricula", academicController.listAdminCurricula);
adminRouter.post(
  "/curricula",
  validate({ body: createCurriculumSchema }),
  academicController.createCurriculum,
);
adminRouter.patch(
  "/curricula/:id",
  validate({ params: objectIdParamSchema, body: updateCurriculumSchema }),
  academicController.updateCurriculum,
);
adminRouter.delete(
  "/curricula/:id",
  validate({ params: objectIdParamSchema }),
  academicController.archiveCurriculum,
);

adminRouter.get(
  "/curricula/:curriculumId/semesters",
  validate({
    params: z.object({ curriculumId: z.string().regex(/^[a-f\d]{24}$/i) }),
  }),
  academicController.listAdminCurriculumSemesters,
);
adminRouter.post(
  "/curricula/:curriculumId/semesters",
  validate({
    params: z.object({ curriculumId: z.string().regex(/^[a-f\d]{24}$/i) }),
    body: assignCurriculumSemestersSchema,
  }),
  academicController.assignCurriculumSemesters,
);
adminRouter.delete(
  "/curricula/:curriculumId/semesters/:semesterId",
  validate({
    params: z.object({
      curriculumId: z.string().regex(/^[a-f\d]{24}$/i),
      semesterId: z.string().regex(/^[a-f\d]{24}$/i),
    }),
  }),
  academicController.archiveCurriculumSemester,
);

adminRouter.get("/semesters", academicController.listAdminSemesters);
adminRouter.post(
  "/semesters",
  validate({ body: createSemesterSchema }),
  academicController.createSemester,
);
adminRouter.patch(
  "/semesters/:id",
  validate({ params: objectIdParamSchema, body: updateSemesterSchema }),
  academicController.updateSemester,
);
adminRouter.delete(
  "/semesters/:id",
  validate({ params: objectIdParamSchema }),
  academicController.archiveSemester,
);

adminRouter.get("/subjects", academicController.listAdminSubjects);
adminRouter.post(
  "/subjects",
  validate({ body: createSubjectSchema }),
  academicController.createSubject,
);
adminRouter.patch(
  "/subjects/:id",
  validate({ params: objectIdParamSchema, body: updateSubjectSchema }),
  academicController.updateSubject,
);
adminRouter.delete(
  "/subjects/:id",
  validate({ params: objectIdParamSchema }),
  academicController.archiveSubject,
);

adminRouter.get(
  "/course-slots",
  validate({ query: listCourseSlotsQuerySchema }),
  academicController.listAdminCourseSlots,
);
adminRouter.post(
  "/course-slots",
  validate({ body: createCourseSlotSchema }),
  academicController.createCourseSlot,
);
adminRouter.patch(
  "/course-slots/:id",
  validate({ params: objectIdParamSchema, body: updateCourseSlotSchema }),
  academicController.updateCourseSlot,
);
adminRouter.delete(
  "/course-slots/:id",
  validate({ params: objectIdParamSchema }),
  academicController.archiveCourseSlot,
);

export { adminRouter };
