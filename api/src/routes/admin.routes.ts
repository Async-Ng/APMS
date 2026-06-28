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
  assignMajorSemestersSchema,
  createCurriculumCourseSchema,
  createMajorSchema,
  createSemesterSchema,
  createSubjectSchema,
  listCurriculumQuerySchema,
  updateCurriculumCourseSchema,
  updateMajorSchema,
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

adminRouter.get("/majors", academicController.listAdminMajors);
adminRouter.post(
  "/majors",
  validate({ body: createMajorSchema }),
  academicController.createMajor,
);
adminRouter.patch(
  "/majors/:id",
  validate({ params: objectIdParamSchema, body: updateMajorSchema }),
  academicController.updateMajor,
);
adminRouter.delete(
  "/majors/:id",
  validate({ params: objectIdParamSchema }),
  academicController.archiveMajor,
);

adminRouter.get(
  "/majors/:majorId/semesters",
  validate({
    params: z.object({ majorId: z.string().regex(/^[a-f\d]{24}$/i) }),
  }),
  academicController.listAdminMajorSemesters,
);
adminRouter.post(
  "/majors/:majorId/semesters",
  validate({
    params: z.object({ majorId: z.string().regex(/^[a-f\d]{24}$/i) }),
    body: assignMajorSemestersSchema,
  }),
  academicController.assignMajorSemesters,
);
adminRouter.delete(
  "/majors/:majorId/semesters/:semesterId",
  validate({
    params: z.object({
      majorId: z.string().regex(/^[a-f\d]{24}$/i),
      semesterId: z.string().regex(/^[a-f\d]{24}$/i),
    }),
  }),
  academicController.archiveMajorSemester,
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
  "/curriculum-courses",
  validate({ query: listCurriculumQuerySchema }),
  academicController.listAdminCurriculum,
);
adminRouter.post(
  "/curriculum-courses",
  validate({ body: createCurriculumCourseSchema }),
  academicController.createCurriculumCourse,
);
adminRouter.patch(
  "/curriculum-courses/:id",
  validate({ params: objectIdParamSchema, body: updateCurriculumCourseSchema }),
  academicController.updateCurriculumCourse,
);
adminRouter.delete(
  "/curriculum-courses/:id",
  validate({ params: objectIdParamSchema }),
  academicController.archiveCurriculumCourse,
);

export { adminRouter };
