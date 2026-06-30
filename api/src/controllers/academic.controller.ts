import type { Request, Response } from "express";
import type { z } from "zod";

import { unauthorizedError } from "../errors/unauthorized";
import * as academicService from "../services/academic.service";
import { sendSuccess } from "../utils/apiResponse";
import { catchAsync } from "../utils/catchAsync";
import { getRouteParam } from "../utils/params";
import type {
  catalogCourseSlotsQuerySchema,
  listCourseSlotsQuerySchema,
} from "../validators/academic.validator";

function requireUser(req: Request) {
  if (!req.currentUser) throw unauthorizedError();
  return req.currentUser;
}

export const createCurriculum = catchAsync(async (req: Request, res: Response) => {
  sendSuccess(res, await academicService.createCurriculum(req.body), 201);
});
export const listAdminCurricula = catchAsync(async (_req: Request, res: Response) => {
  sendSuccess(res, await academicService.listCurricula(true));
});
export const updateCurriculum = catchAsync(async (req: Request, res: Response) => {
  sendSuccess(res, await academicService.updateCurriculum(getRouteParam(req, "id"), req.body));
});
export const archiveCurriculum = catchAsync(async (req: Request, res: Response) => {
  sendSuccess(res, await academicService.archiveCurriculum(getRouteParam(req, "id")));
});

export const createSubject = catchAsync(async (req: Request, res: Response) => {
  sendSuccess(res, await academicService.createSubject(req.body), 201);
});
export const listAdminSubjects = catchAsync(async (_req: Request, res: Response) => {
  sendSuccess(res, await academicService.listSubjects(true));
});
export const updateSubject = catchAsync(async (req: Request, res: Response) => {
  sendSuccess(res, await academicService.updateSubject(getRouteParam(req, "id"), req.body));
});
export const archiveSubject = catchAsync(async (req: Request, res: Response) => {
  sendSuccess(res, await academicService.archiveSubject(getRouteParam(req, "id")));
});

export const createSemester = catchAsync(async (req: Request, res: Response) => {
  sendSuccess(res, await academicService.createSemester(req.body), 201);
});
export const listAdminSemesters = catchAsync(async (_req: Request, res: Response) => {
  sendSuccess(res, await academicService.listSemesters(true));
});
export const updateSemester = catchAsync(async (req: Request, res: Response) => {
  sendSuccess(res, await academicService.updateSemester(getRouteParam(req, "id"), req.body));
});
export const archiveSemester = catchAsync(async (req: Request, res: Response) => {
  sendSuccess(res, await academicService.archiveSemester(getRouteParam(req, "id")));
});

export const listAdminCurriculumSemesters = catchAsync(async (req: Request, res: Response) => {
  sendSuccess(
    res,
    await academicService.listCurriculumSemesters(getRouteParam(req, "curriculumId"), true),
  );
});
export const assignCurriculumSemesters = catchAsync(async (req: Request, res: Response) => {
  sendSuccess(
    res,
    await academicService.assignSemestersToCurriculum(
      getRouteParam(req, "curriculumId"),
      req.body.semesterIds,
    ),
    201,
  );
});
export const archiveCurriculumSemester = catchAsync(async (req: Request, res: Response) => {
  sendSuccess(
    res,
    await academicService.archiveCurriculumSemester(
      getRouteParam(req, "curriculumId"),
      getRouteParam(req, "semesterId"),
    ),
  );
});

export const createCourseSlot = catchAsync(async (req: Request, res: Response) => {
  sendSuccess(res, await academicService.createCourseSlot(req.body), 201);
});
export const listAdminCourseSlots = catchAsync(async (req: Request, res: Response) => {
  const query = req.validatedQuery as z.infer<typeof listCourseSlotsQuerySchema>;
  sendSuccess(res, await academicService.listCourseSlots(query));
});
export const updateCourseSlot = catchAsync(async (req: Request, res: Response) => {
  sendSuccess(res, await academicService.updateCourseSlot(getRouteParam(req, "id"), req.body));
});
export const archiveCourseSlot = catchAsync(async (req: Request, res: Response) => {
  sendSuccess(res, await academicService.archiveCourseSlot(getRouteParam(req, "id")));
});

export const listCatalogCurricula = catchAsync(async (_req: Request, res: Response) => {
  sendSuccess(res, await academicService.listCatalogCurricula());
});
export const listCatalogSemesters = catchAsync(async (_req: Request, res: Response) => {
  sendSuccess(res, await academicService.listCatalogSemesters());
});
export const listCatalogCurriculumSemesters = catchAsync(async (req: Request, res: Response) => {
  sendSuccess(
    res,
    await academicService.listCatalogCurriculumSemesters(getRouteParam(req, "curriculumId")),
  );
});
export const listCatalogCourseSlots = catchAsync(async (req: Request, res: Response) => {
  const query = req.validatedQuery as z.infer<typeof catalogCourseSlotsQuerySchema>;
  sendSuccess(
    res,
    await academicService.listCatalogCourseSlots(
      getRouteParam(req, "curriculumId"),
      query.semesterId,
    ),
  );
});

export const getAcademicProfile = catchAsync(async (req: Request, res: Response) => {
  sendSuccess(res, await academicService.getAcademicProfile(requireUser(req)));
});
export const updateAcademicProfile = catchAsync(async (req: Request, res: Response) => {
  sendSuccess(res, await academicService.updateAcademicProfile(requireUser(req), req.body));
});
