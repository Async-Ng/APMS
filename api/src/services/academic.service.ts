import { Types } from "mongoose";

import { createAppError, ErrorCode } from "../errors/error-codes";
import {
  CurriculumCourse,
  toCurriculumCourseResponse,
  type CurriculumCourseDocument,
} from "../models/curriculum-course.model";
import { Document } from "../models/document.model";
import { Major, toMajorResponse } from "../models/major.model";
import { Subject, toSubjectResponse } from "../models/subject.model";
import { User, type UserDocument } from "../models/user.model";
import { parseObjectId } from "../utils/objectId";

function conflict(detail: string): never {
  throw createAppError(ErrorCode.ACADEMIC_CONFLICT, 409, { technicalDetail: detail });
}

function notFound(entity: "major" | "subject" | "curriculum"): never {
  const code =
    entity === "major"
      ? ErrorCode.MAJOR_NOT_FOUND
      : entity === "subject"
        ? ErrorCode.SUBJECT_NOT_FOUND
        : ErrorCode.CURRICULUM_NOT_FOUND;
  throw createAppError(code, 404);
}

function isDuplicateKey(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}

export async function createMajor(input: {
  code: string;
  name: string;
  description?: string;
}) {
  try {
    const major = await Major.create(input);
    return toMajorResponse(major);
  } catch (error) {
    if (isDuplicateKey(error)) conflict("Major code already exists");
    throw error;
  }
}

export async function listMajors(includeInactive = true) {
  const majors = await Major.find(includeInactive ? {} : { isActive: true }).sort({ code: 1 });
  return majors.map(toMajorResponse);
}

export async function updateMajor(
  majorId: string,
  input: { code?: string; name?: string; description?: string; isActive?: boolean },
) {
  const major = await Major.findById(parseObjectId(majorId));
  if (!major) notFound("major");

  if (input.isActive === false && major.isActive) {
    const assignedUsers = await User.countDocuments({ majorId: major._id });
    if (assignedUsers > 0) conflict("Major is assigned to active student profiles");
  }

  Object.assign(major, input);
  try {
    await major.save();
  } catch (error) {
    if (isDuplicateKey(error)) conflict("Major code already exists");
    throw error;
  }
  return toMajorResponse(major);
}

export async function archiveMajor(majorId: string) {
  return updateMajor(majorId, { isActive: false });
}

export async function createSubject(input: {
  code: string;
  name: string;
  description?: string;
}) {
  try {
    const subject = await Subject.create(input);
    return toSubjectResponse(subject);
  } catch (error) {
    if (isDuplicateKey(error)) conflict("Subject code already exists");
    throw error;
  }
}

export async function listSubjects(includeInactive = true) {
  const subjects = await Subject.find(includeInactive ? {} : { isActive: true }).sort({ code: 1 });
  return subjects.map(toSubjectResponse);
}

export async function updateSubject(
  subjectId: string,
  input: { code?: string; name?: string; description?: string; isActive?: boolean },
) {
  const subject = await Subject.findById(parseObjectId(subjectId));
  if (!subject) notFound("subject");

  if (input.isActive === false && subject.isActive) {
    const assignedUsers = await User.countDocuments({ currentSubjectIds: subject._id });
    if (assignedUsers > 0) conflict("Subject is selected by active student profiles");
  }

  Object.assign(subject, input);
  try {
    await subject.save();
  } catch (error) {
    if (isDuplicateKey(error)) conflict("Subject code already exists");
    throw error;
  }
  return toSubjectResponse(subject);
}

export async function archiveSubject(subjectId: string) {
  return updateSubject(subjectId, { isActive: false });
}

async function assertActiveMajorAndSubject(majorId: Types.ObjectId, subjectId: Types.ObjectId) {
  const [major, subject] = await Promise.all([
    Major.findOne({ _id: majorId, isActive: true }),
    Subject.findOne({ _id: subjectId, isActive: true }),
  ]);
  if (!major) notFound("major");
  if (!subject) notFound("subject");
}

export async function createCurriculumCourse(input: {
  majorId: string;
  semesterNumber: number;
  subjectId: string;
}) {
  const majorId = parseObjectId(input.majorId, "majorId");
  const subjectId = parseObjectId(input.subjectId, "subjectId");
  await assertActiveMajorAndSubject(majorId, subjectId);
  try {
    const course = await CurriculumCourse.create({ ...input, majorId, subjectId });
    return toCurriculumCourseResponse(course);
  } catch (error) {
    if (isDuplicateKey(error)) conflict("Curriculum mapping already exists");
    throw error;
  }
}

async function assertCourseNotSelected(course: CurriculumCourseDocument): Promise<void> {
  const selected = await User.countDocuments({
    majorId: course.majorId,
    currentSemester: course.semesterNumber,
    currentSubjectIds: course.subjectId,
  });
  if (selected > 0) conflict("Curriculum course is selected by active student profiles");
}

export async function updateCurriculumCourse(
  courseId: string,
  input: { majorId?: string; semesterNumber?: number; subjectId?: string; isActive?: boolean },
) {
  const course = await CurriculumCourse.findById(parseObjectId(courseId));
  if (!course) notFound("curriculum");

  const changesIdentity =
    input.majorId !== undefined ||
    input.semesterNumber !== undefined ||
    input.subjectId !== undefined;
  if (changesIdentity || (input.isActive === false && course.isActive)) {
    await assertCourseNotSelected(course);
  }
  if (changesIdentity) {
    const referencedDocuments = await Document.countDocuments({
      curriculumCourseId: course._id,
    });
    if (referencedDocuments > 0) {
      conflict("Curriculum identity is immutable after documents reference it");
    }
  }

  const majorId = input.majorId ? parseObjectId(input.majorId, "majorId") : course.majorId;
  const subjectId = input.subjectId
    ? parseObjectId(input.subjectId, "subjectId")
    : course.subjectId;
  if (changesIdentity || input.isActive === true) {
    await assertActiveMajorAndSubject(majorId as Types.ObjectId, subjectId as Types.ObjectId);
  }

  course.majorId = majorId;
  course.subjectId = subjectId;
  if (input.semesterNumber !== undefined) course.semesterNumber = input.semesterNumber;
  if (input.isActive !== undefined) course.isActive = input.isActive;

  try {
    await course.save();
  } catch (error) {
    if (isDuplicateKey(error)) conflict("Curriculum mapping already exists");
    throw error;
  }
  return toCurriculumCourseResponse(course);
}

export async function archiveCurriculumCourse(courseId: string) {
  return updateCurriculumCourse(courseId, { isActive: false });
}

export async function listCurriculum(options: {
  majorId?: string | undefined;
  semesterNumber?: number | undefined;
  includeInactive?: boolean | undefined;
}) {
  const filter: Record<string, unknown> = {};
  if (options.majorId) filter.majorId = parseObjectId(options.majorId, "majorId");
  if (options.semesterNumber !== undefined) filter.semesterNumber = options.semesterNumber;
  if (!options.includeInactive) filter.isActive = true;

  const courses = await CurriculumCourse.find(filter).sort({ semesterNumber: 1, subjectId: 1 });
  return enrichCurriculum(courses);
}

async function enrichCurriculum(courses: CurriculumCourseDocument[]) {
  const majorIds = [...new Set(courses.map((course) => course.majorId.toString()))];
  const subjectIds = [...new Set(courses.map((course) => course.subjectId.toString()))];
  const [majors, subjects] = await Promise.all([
    Major.find({ _id: { $in: majorIds } }),
    Subject.find({ _id: { $in: subjectIds } }),
  ]);
  const majorMap = new Map(majors.map((major) => [major._id.toString(), toMajorResponse(major)]));
  const subjectMap = new Map(
    subjects.map((subject) => [subject._id.toString(), toSubjectResponse(subject)]),
  );
  return courses.map((course) => ({
    ...toCurriculumCourseResponse(course),
    major: majorMap.get(course.majorId.toString()) ?? null,
    subject: subjectMap.get(course.subjectId.toString()) ?? null,
  }));
}

export async function listCatalogMajors() {
  return listMajors(false);
}

export async function listCatalogCurriculum(majorId: string, semesterNumber?: number) {
  const majorObjectId = parseObjectId(majorId, "majorId");
  const major = await Major.findOne({ _id: majorObjectId, isActive: true });
  if (!major) notFound("major");

  const filter: Record<string, unknown> = { majorId: majorObjectId, isActive: true };
  if (semesterNumber !== undefined) filter.semesterNumber = semesterNumber;
  const courses = await CurriculumCourse.find(filter).sort({ semesterNumber: 1, subjectId: 1 });
  const subjectIds = courses.map((course) => course.subjectId);
  const activeSubjects = new Set(
    (await Subject.find({ _id: { $in: subjectIds }, isActive: true }).select("_id"))
      .map((subject) => subject._id.toString()),
  );
  return enrichCurriculum(
    courses.filter((course) => activeSubjects.has(course.subjectId.toString())),
  );
}

export async function assertUserCanUseCurriculumCourse(
  user: UserDocument,
  curriculumCourseId: string,
): Promise<CurriculumCourseDocument> {
  if (!user.majorId || !user.currentSemester) {
    throw createAppError(ErrorCode.ACADEMIC_PROFILE_REQUIRED, 409);
  }
  const course = await CurriculumCourse.findOne({
    _id: parseObjectId(curriculumCourseId, "curriculumCourseId"),
    majorId: user.majorId,
    semesterNumber: user.currentSemester,
    subjectId: { $in: user.currentSubjectIds },
    isActive: true,
  });
  if (!course) throw createAppError(ErrorCode.CURRICULUM_NOT_ENROLLED, 403);
  await assertActiveMajorAndSubject(course.majorId as Types.ObjectId, course.subjectId as Types.ObjectId);
  return course;
}

export async function getAcademicProfile(user: UserDocument) {
  const [major, subjects] = await Promise.all([
    user.majorId ? Major.findById(user.majorId) : null,
    Subject.find({ _id: { $in: user.currentSubjectIds } }).sort({ code: 1 }),
  ]);
  return {
    major: major ? toMajorResponse(major) : null,
    currentSemester: user.currentSemester ?? null,
    currentSubjects: subjects.map(toSubjectResponse),
    isComplete: Boolean(major && user.currentSemester && subjects.length > 0),
  };
}

export async function updateAcademicProfile(
  user: UserDocument,
  input: { majorId: string; currentSemester: number; currentSubjectIds: string[] },
) {
  const majorId = parseObjectId(input.majorId, "majorId");
  const subjectIds = input.currentSubjectIds.map((id) => parseObjectId(id, "currentSubjectIds"));
  const [major, courses] = await Promise.all([
    Major.findOne({ _id: majorId, isActive: true }),
    CurriculumCourse.find({
      majorId,
      semesterNumber: input.currentSemester,
      subjectId: { $in: subjectIds },
      isActive: true,
    }),
  ]);
  if (!major) notFound("major");
  const activeSubjects = await Subject.countDocuments({
    _id: { $in: subjectIds },
    isActive: true,
  });
  if (courses.length !== subjectIds.length || activeSubjects !== subjectIds.length) {
    throw createAppError(ErrorCode.CURRICULUM_NOT_ENROLLED, 400, {
      technicalDetail: "Every subject must be active and belong to the selected major and semester",
    });
  }

  const updated = await User.findByIdAndUpdate(
    user._id,
    { $set: { majorId, currentSemester: input.currentSemester, currentSubjectIds: subjectIds } },
    { returnDocument: "after", runValidators: true },
  );
  if (!updated) throw createAppError(ErrorCode.USER_NOT_FOUND, 404);
  return getAcademicProfile(updated);
}
