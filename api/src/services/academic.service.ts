import { Types } from "mongoose";

import { createAppError, ErrorCode } from "../errors/error-codes";
import {
  CurriculumCourse,
  toCurriculumCourseResponse,
  type CurriculumCourseDocument,
} from "../models/curriculum-course.model";
import { Document } from "../models/document.model";
import {
  MajorSemester,
  toMajorSemesterResponse,
  type MajorSemesterDocument,
} from "../models/major-semester.model";
import { Major, toMajorResponse } from "../models/major.model";
import { Semester, toSemesterResponse, type SemesterDocument } from "../models/semester.model";
import { Subject, toSubjectResponse } from "../models/subject.model";
import { User, type UserDocument } from "../models/user.model";
import { parseObjectId } from "../utils/objectId";

function conflict(detail: string): never {
  throw createAppError(ErrorCode.ACADEMIC_CONFLICT, 409, { technicalDetail: detail });
}

function notFound(
  entity: "major" | "subject" | "semester" | "majorSemester" | "curriculum",
): never {
  const code =
    entity === "major"
      ? ErrorCode.MAJOR_NOT_FOUND
      : entity === "subject"
        ? ErrorCode.SUBJECT_NOT_FOUND
        : entity === "semester"
          ? ErrorCode.SEMESTER_NOT_FOUND
          : entity === "majorSemester"
            ? ErrorCode.MAJOR_SEMESTER_NOT_FOUND
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

export async function createSemester(input: {
  code: string;
  name: string;
  sortOrder?: number;
}) {
  try {
    const semester = await Semester.create({
      ...input,
      sortOrder: input.sortOrder ?? 0,
    });
    return toSemesterResponse(semester);
  } catch (error) {
    if (isDuplicateKey(error)) conflict("Semester code already exists");
    throw error;
  }
}

export async function listSemesters(includeInactive = true) {
  const semesters = await Semester.find(includeInactive ? {} : { isActive: true }).sort({
    sortOrder: 1,
    code: 1,
  });
  return semesters.map(toSemesterResponse);
}

export async function updateSemester(
  semesterId: string,
  input: { code?: string; name?: string; sortOrder?: number; isActive?: boolean },
) {
  const semester = await Semester.findById(parseObjectId(semesterId));
  if (!semester) notFound("semester");

  if (input.isActive === false && semester.isActive) {
    const [users, links] = await Promise.all([
      User.countDocuments({ currentSemesterId: semester._id }),
      MajorSemester.countDocuments({ semesterId: semester._id, isActive: true }),
    ]);
    if (users > 0 || links > 0) {
      conflict("Semester is in use by student profiles or major assignments");
    }
  }

  Object.assign(semester, input);
  try {
    await semester.save();
  } catch (error) {
    if (isDuplicateKey(error)) conflict("Semester code already exists");
    throw error;
  }
  return toSemesterResponse(semester);
}

export async function archiveSemester(semesterId: string) {
  return updateSemester(semesterId, { isActive: false });
}

async function assertActiveMajor(majorId: Types.ObjectId) {
  const major = await Major.findOne({ _id: majorId, isActive: true });
  if (!major) notFound("major");
  return major;
}

async function assertActiveSemester(semesterId: Types.ObjectId) {
  const semester = await Semester.findOne({ _id: semesterId, isActive: true });
  if (!semester) notFound("semester");
  return semester;
}

async function assertActiveMajorSemester(
  majorId: Types.ObjectId,
  semesterId: Types.ObjectId,
): Promise<MajorSemesterDocument> {
  const link = await MajorSemester.findOne({ majorId, semesterId, isActive: true });
  if (!link) notFound("majorSemester");
  return link;
}

export async function listMajorSemesters(majorId: string, includeInactive = false) {
  const majorObjectId = parseObjectId(majorId, "majorId");
  await assertActiveMajor(majorObjectId);

  const filter: Record<string, unknown> = { majorId: majorObjectId };
  if (!includeInactive) filter.isActive = true;

  const links = await MajorSemester.find(filter);
  const semesterIds = links.map((link) => link.semesterId);
  const semesters = await Semester.find({ _id: { $in: semesterIds } });
  const semesterMap = new Map(
    semesters.map((semester) => [semester._id.toString(), toSemesterResponse(semester)]),
  );

  return links
    .map((link) => {
      const semester = semesterMap.get(link.semesterId.toString()) ?? null;
      return {
        ...toMajorSemesterResponse(link),
        semester,
        effectiveSortOrder: link.sortOrder ?? semester?.sortOrder ?? 0,
      };
    })
    .filter((item) => item.semester !== null)
    .sort((a, b) => a.effectiveSortOrder - b.effectiveSortOrder);
}

export async function assignSemestersToMajor(
  majorId: string,
  semesterIds: string[],
) {
  const majorObjectId = parseObjectId(majorId, "majorId");
  await assertActiveMajor(majorObjectId);

  const uniqueIds = [...new Set(semesterIds)];
  const objectIds = uniqueIds.map((id) => parseObjectId(id, "semesterId"));
  const activeCount = await Semester.countDocuments({
    _id: { $in: objectIds },
    isActive: true,
  });
  if (activeCount !== objectIds.length) notFound("semester");

  const results = [];
  for (const semesterId of objectIds) {
    try {
      const link = await MajorSemester.findOneAndUpdate(
        { majorId: majorObjectId, semesterId },
        { $set: { isActive: true }, $setOnInsert: { majorId: majorObjectId, semesterId } },
        { upsert: true, returnDocument: "after", runValidators: true },
      );
      if (link) results.push(link);
    } catch (error) {
      if (!isDuplicateKey(error)) throw error;
    }
  }

  return listMajorSemesters(majorId, true);
}

export async function archiveMajorSemester(majorId: string, semesterId: string) {
  const majorObjectId = parseObjectId(majorId, "majorId");
  const semesterObjectId = parseObjectId(semesterId, "semesterId");
  const link = await MajorSemester.findOne({ majorId: majorObjectId, semesterId: semesterObjectId });
  if (!link) notFound("majorSemester");

  const [users, courses] = await Promise.all([
    User.countDocuments({ majorId: majorObjectId, currentSemesterId: semesterObjectId }),
    CurriculumCourse.countDocuments({
      majorId: majorObjectId,
      semesterId: semesterObjectId,
      isActive: true,
    }),
  ]);
  if (users > 0 || courses > 0) {
    conflict("Major semester is in use by student profiles or curriculum mappings");
  }

  link.isActive = false;
  await link.save();
  return toMajorSemesterResponse(link);
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
  semesterId: string;
  subjectId: string;
}) {
  const majorId = parseObjectId(input.majorId, "majorId");
  const semesterId = parseObjectId(input.semesterId, "semesterId");
  const subjectId = parseObjectId(input.subjectId, "subjectId");
  await assertActiveMajorAndSubject(majorId, subjectId);
  await assertActiveMajorSemester(majorId, semesterId);
  try {
    const course = await CurriculumCourse.create({ majorId, semesterId, subjectId });
    return enrichCurriculum([course]).then((items) => items[0]!);
  } catch (error) {
    if (isDuplicateKey(error)) conflict("Curriculum mapping already exists");
    throw error;
  }
}

async function assertCourseNotSelected(course: CurriculumCourseDocument): Promise<void> {
  const selected = await User.countDocuments({
    majorId: course.majorId,
    currentSemesterId: course.semesterId,
    currentSubjectIds: course.subjectId,
  });
  if (selected > 0) conflict("Curriculum course is selected by active student profiles");
}

export async function updateCurriculumCourse(
  courseId: string,
  input: { majorId?: string; semesterId?: string; subjectId?: string; isActive?: boolean },
) {
  const course = await CurriculumCourse.findById(parseObjectId(courseId));
  if (!course) notFound("curriculum");

  const changesIdentity =
    input.majorId !== undefined ||
    input.semesterId !== undefined ||
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
  const semesterId = input.semesterId
    ? parseObjectId(input.semesterId, "semesterId")
    : course.semesterId;
  const subjectId = input.subjectId
    ? parseObjectId(input.subjectId, "subjectId")
    : course.subjectId;
  if (changesIdentity || input.isActive === true) {
    await assertActiveMajorAndSubject(majorId as Types.ObjectId, subjectId as Types.ObjectId);
    await assertActiveMajorSemester(majorId as Types.ObjectId, semesterId as Types.ObjectId);
  }

  course.majorId = majorId;
  course.semesterId = semesterId;
  course.subjectId = subjectId;
  if (input.isActive !== undefined) course.isActive = input.isActive;

  try {
    await course.save();
  } catch (error) {
    if (isDuplicateKey(error)) conflict("Curriculum mapping already exists");
    throw error;
  }
  return enrichCurriculum([course]).then((items) => items[0]!);
}

export async function archiveCurriculumCourse(courseId: string) {
  return updateCurriculumCourse(courseId, { isActive: false });
}

export async function listCurriculum(options: {
  majorId?: string | undefined;
  semesterId?: string | undefined;
  includeInactive?: boolean | undefined;
}) {
  const filter: Record<string, unknown> = {};
  if (options.majorId) filter.majorId = parseObjectId(options.majorId, "majorId");
  if (options.semesterId) filter.semesterId = parseObjectId(options.semesterId, "semesterId");
  if (!options.includeInactive) filter.isActive = true;

  const courses = await CurriculumCourse.find(filter).sort({ semesterId: 1, subjectId: 1 });
  return enrichCurriculum(courses);
}

async function enrichCurriculum(courses: CurriculumCourseDocument[]) {
  const majorIds = [...new Set(courses.map((course) => course.majorId.toString()))];
  const subjectIds = [...new Set(courses.map((course) => course.subjectId.toString()))];
  const semesterIds = [...new Set(courses.map((course) => course.semesterId.toString()))];
  const [majors, subjects, semesters] = await Promise.all([
    Major.find({ _id: { $in: majorIds } }),
    Subject.find({ _id: { $in: subjectIds } }),
    Semester.find({ _id: { $in: semesterIds } }),
  ]);
  const majorMap = new Map(majors.map((major) => [major._id.toString(), toMajorResponse(major)]));
  const subjectMap = new Map(
    subjects.map((subject) => [subject._id.toString(), toSubjectResponse(subject)]),
  );
  const semesterMap = new Map(
    semesters.map((semester) => [semester._id.toString(), toSemesterResponse(semester)]),
  );
  return courses.map((course) => ({
    ...toCurriculumCourseResponse(course),
    major: majorMap.get(course.majorId.toString()) ?? null,
    subject: subjectMap.get(course.subjectId.toString()) ?? null,
    semester: semesterMap.get(course.semesterId.toString()) ?? null,
  }));
}

export async function listCatalogMajors() {
  return listMajors(false);
}

export async function listCatalogSemesters() {
  return listSemesters(false);
}

export async function listCatalogMajorSemesters(majorId: string) {
  return listMajorSemesters(majorId, false);
}

export async function listCatalogCurriculum(majorId: string, semesterId?: string) {
  const majorObjectId = parseObjectId(majorId, "majorId");
  const major = await Major.findOne({ _id: majorObjectId, isActive: true });
  if (!major) notFound("major");

  const filter: Record<string, unknown> = { majorId: majorObjectId, isActive: true };
  if (semesterId !== undefined) {
    filter.semesterId = parseObjectId(semesterId, "semesterId");
  }
  const courses = await CurriculumCourse.find(filter).sort({ semesterId: 1, subjectId: 1 });
  const subjectIds = courses.map((course) => course.subjectId);
  const activeSubjects = new Set(
    (await Subject.find({ _id: { $in: subjectIds }, isActive: true }).select("_id")).map(
      (subject) => subject._id.toString(),
    ),
  );
  return enrichCurriculum(
    courses.filter((course) => activeSubjects.has(course.subjectId.toString())),
  );
}

export async function assertUserCanUseCurriculumCourse(
  user: UserDocument,
  curriculumCourseId: string,
): Promise<CurriculumCourseDocument> {
  if (!user.majorId || !user.currentSemesterId) {
    throw createAppError(ErrorCode.ACADEMIC_PROFILE_REQUIRED, 409);
  }
  const course = await CurriculumCourse.findOne({
    _id: parseObjectId(curriculumCourseId, "curriculumCourseId"),
    majorId: user.majorId,
    semesterId: user.currentSemesterId,
    subjectId: { $in: user.currentSubjectIds },
    isActive: true,
  });
  if (!course) throw createAppError(ErrorCode.CURRICULUM_NOT_ENROLLED, 403);
  await assertActiveMajorAndSubject(course.majorId as Types.ObjectId, course.subjectId as Types.ObjectId);
  return course;
}

export async function getAcademicProfile(user: UserDocument) {
  const [major, subjects, semester] = await Promise.all([
    user.majorId ? Major.findById(user.majorId) : null,
    Subject.find({ _id: { $in: user.currentSubjectIds } }).sort({ code: 1 }),
    user.currentSemesterId ? Semester.findById(user.currentSemesterId) : null,
  ]);
  return {
    major: major ? toMajorResponse(major) : null,
    currentSemester: semester ? toSemesterResponse(semester) : null,
    currentSubjects: subjects.map(toSubjectResponse),
    isComplete: Boolean(major && semester && subjects.length > 0),
  };
}

export async function updateAcademicProfile(
  user: UserDocument,
  input: { majorId: string; currentSemesterId: string; currentSubjectIds: string[] },
) {
  const majorId = parseObjectId(input.majorId, "majorId");
  const semesterId = parseObjectId(input.currentSemesterId, "currentSemesterId");
  const subjectIds = input.currentSubjectIds.map((id) => parseObjectId(id, "currentSubjectIds"));
  const [major, , courses] = await Promise.all([
    Major.findOne({ _id: majorId, isActive: true }),
    assertActiveMajorSemester(majorId, semesterId),
    CurriculumCourse.find({
      majorId,
      semesterId,
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
    { $set: { majorId, currentSemesterId: semesterId, currentSubjectIds: subjectIds } },
    { returnDocument: "after", runValidators: true },
  );
  if (!updated) throw createAppError(ErrorCode.USER_NOT_FOUND, 404);
  return getAcademicProfile(updated);
}

/** Resolve semester entity by legacy HK{n} code or numeric sort order. */
export async function resolveSemesterByLegacyNumber(
  semesterNumber: number,
): Promise<SemesterDocument | null> {
  const code = `HK${semesterNumber}`;
  let semester = await Semester.findOne({ code });
  if (!semester) {
    semester = await Semester.findOne({ sortOrder: semesterNumber });
  }
  return semester;
}
