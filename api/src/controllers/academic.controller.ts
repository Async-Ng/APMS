import type { Request, Response } from "express";
import type { z } from "zod";

import { unauthorizedError } from "../errors/unauthorized";
import * as academicService from "../services/academic.service";
import { sendSuccess } from "../utils/apiResponse";
import { catchAsync } from "../utils/catchAsync";
import { getRouteParam } from "../utils/params";
import type {
  catalogCurriculumQuerySchema,
  listCurriculumQuerySchema,
} from "../validators/academic.validator";

function requireUser(req: Request) {
  if (!req.currentUser) throw unauthorizedError();
  return req.currentUser;
}

export const createMajor = catchAsync(async (req: Request, res: Response) => {
  sendSuccess(res, await academicService.createMajor(req.body), 201);
});
export const listAdminMajors = catchAsync(async (_req: Request, res: Response) => {
  sendSuccess(res, await academicService.listMajors(true));
});
export const updateMajor = catchAsync(async (req: Request, res: Response) => {
  sendSuccess(res, await academicService.updateMajor(getRouteParam(req, "id"), req.body));
});
export const archiveMajor = catchAsync(async (req: Request, res: Response) => {
  sendSuccess(res, await academicService.archiveMajor(getRouteParam(req, "id")));
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

export const createCurriculumCourse = catchAsync(async (req: Request, res: Response) => {
  sendSuccess(res, await academicService.createCurriculumCourse(req.body), 201);
});
export const listAdminCurriculum = catchAsync(async (req: Request, res: Response) => {
  const query = req.validatedQuery as z.infer<typeof listCurriculumQuerySchema>;
  sendSuccess(res, await academicService.listCurriculum(query));
});
export const updateCurriculumCourse = catchAsync(async (req: Request, res: Response) => {
  sendSuccess(
    res,
    await academicService.updateCurriculumCourse(getRouteParam(req, "id"), req.body),
  );
});
export const archiveCurriculumCourse = catchAsync(async (req: Request, res: Response) => {
  sendSuccess(
    res,
    await academicService.archiveCurriculumCourse(getRouteParam(req, "id")),
  );
});

export const listCatalogMajors = catchAsync(async (_req: Request, res: Response) => {
  sendSuccess(res, await academicService.listCatalogMajors());
});
export const listCatalogCurriculum = catchAsync(async (req: Request, res: Response) => {
  const query = req.validatedQuery as z.infer<typeof catalogCurriculumQuerySchema>;
  sendSuccess(
    res,
    await academicService.listCatalogCurriculum(
      getRouteParam(req, "majorId"),
      query.semesterNumber,
    ),
  );
});

export const getAcademicProfile = catchAsync(async (req: Request, res: Response) => {
  sendSuccess(res, await academicService.getAcademicProfile(requireUser(req)));
});
export const updateAcademicProfile = catchAsync(async (req: Request, res: Response) => {
  sendSuccess(res, await academicService.updateAcademicProfile(requireUser(req), req.body));
});
