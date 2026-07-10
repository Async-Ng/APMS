import { Types } from "mongoose";

import { createAppError, ErrorCode } from "../errors/error-codes";
import {
  CourseSlot,
  toCourseSlotResponse,
  type CourseSlotDocument,
} from "../models/course-slot.model";
import { Document } from "../models/document.model";
import {
  CurriculumSemester,
  toCurriculumSemesterResponse,
  type CurriculumSemesterDocument,
} from "../models/curriculum-semester.model";
import { Curriculum, toCurriculumResponse } from "../models/curriculum.model";
import { Semester, toSemesterResponse, type SemesterDocument } from "../models/semester.model";
import { Subject, toSubjectResponse } from "../models/subject.model";
import { User, type UserDocument } from "../models/user.model";
import { parseObjectId } from "../utils/objectId";

function conflict(detail: string): never {
  throw createAppError(ErrorCode.ACADEMIC_CONFLICT, 409, { technicalDetail: detail });
}

function notFound(
  entity: "curriculum" | "subject" | "semester" | "curriculumSemester" | "courseSlot",
): never {
  const code =
    entity === "curriculum"
      ? ErrorCode.CURRICULUM_NOT_FOUND
      : entity === "subject"
        ? ErrorCode.SUBJECT_NOT_FOUND
        : entity === "semester"
          ? ErrorCode.SEMESTER_NOT_FOUND
          : entity === "curriculumSemester"
            ? ErrorCode.CURRICULUM_SEMESTER_NOT_FOUND
            : ErrorCode.COURSE_SLOT_NOT_FOUND;
  throw createAppError(code, 404);
}

function isDuplicateKey(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}

export async function createCurriculum(input: {
  code: string;
  name: string;
  description?: string;
}) {
  try {
    const curriculum = await Curriculum.create(input);
    return toCurriculumResponse(curriculum);
  } catch (error) {
    if (isDuplicateKey(error)) conflict("Curriculum code already exists");
    throw error;
  }
}

export async function listCurricula(includeInactive = true) {
  const curricula = await Curriculum.find(includeInactive ? {} : { isActive: true }).sort({
    code: 1,
  });
  return curricula.map(toCurriculumResponse);
}

export async function updateCurriculum(
  curriculumId: string,
  input: { code?: string; name?: string; description?: string; isActive?: boolean },
) {
  const curriculum = await Curriculum.findById(parseObjectId(curriculumId));
  if (!curriculum) notFound("curriculum");

  if (input.isActive === false && curriculum.isActive) {
    const assignedUsers = await User.countDocuments({ curriculumId: curriculum._id });
    if (assignedUsers > 0) conflict("Curriculum is assigned to active student profiles");
  }

  Object.assign(curriculum, input);
  try {
    await curriculum.save();
  } catch (error) {
    if (isDuplicateKey(error)) conflict("Curriculum code already exists");
    throw error;
  }
  return toCurriculumResponse(curriculum);
}

export async function archiveCurriculum(curriculumId: string) {
  return updateCurriculum(curriculumId, { isActive: false });
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
      CurriculumSemester.countDocuments({ semesterId: semester._id, isActive: true }),
    ]);
    if (users > 0 || links > 0) {
      conflict("Semester is in use by student profiles or curriculum assignments");
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

async function assertActiveCurriculum(curriculumId: Types.ObjectId) {
  const curriculum = await Curriculum.findOne({ _id: curriculumId, isActive: true });
  if (!curriculum) notFound("curriculum");
  return curriculum;
}

async function assertActiveSemester(semesterId: Types.ObjectId) {
  const semester = await Semester.findOne({ _id: semesterId, isActive: true });
  if (!semester) notFound("semester");
  return semester;
}

async function assertActiveCurriculumSemester(
  curriculumId: Types.ObjectId,
  semesterId: Types.ObjectId,
): Promise<CurriculumSemesterDocument> {
  const link = await CurriculumSemester.findOne({ curriculumId, semesterId, isActive: true });
  if (!link) notFound("curriculumSemester");
  return link;
}

export async function listCurriculumSemesters(curriculumId: string, includeInactive = false) {
  const curriculumObjectId = parseObjectId(curriculumId, "curriculumId");
  if (includeInactive) {
    const curriculum = await Curriculum.findById(curriculumObjectId);
    if (!curriculum) notFound("curriculum");
  } else {
    await assertActiveCurriculum(curriculumObjectId);
  }

  const filter: Record<string, unknown> = { curriculumId: curriculumObjectId };
  if (!includeInactive) filter.isActive = true;

  const links = await CurriculumSemester.find(filter);
  const semesterIds = links.map((link) => link.semesterId);
  const semesters = await Semester.find({ _id: { $in: semesterIds } });
  const semesterMap = new Map(
    semesters.map((semester) => [semester._id.toString(), toSemesterResponse(semester)]),
  );

  return links
    .map((link) => {
      const semester = semesterMap.get(link.semesterId.toString()) ?? null;
      return {
        ...toCurriculumSemesterResponse(link),
        semester,
        effectiveSortOrder: link.sortOrder ?? semester?.sortOrder ?? 0,
      };
    })
    .filter((item) => item.semester !== null)
    .sort((a, b) => a.effectiveSortOrder - b.effectiveSortOrder);
}

export async function assignSemestersToCurriculum(
  curriculumId: string,
  semesterIds: string[],
) {
  const curriculumObjectId = parseObjectId(curriculumId, "curriculumId");
  await assertActiveCurriculum(curriculumObjectId);

  const uniqueIds = [...new Set(semesterIds)];
  const objectIds = uniqueIds.map((id) => parseObjectId(id, "semesterId"));
  const activeCount = await Semester.countDocuments({
    _id: { $in: objectIds },
    isActive: true,
  });
  if (activeCount !== objectIds.length) notFound("semester");

  for (const semesterId of objectIds) {
    try {
      await CurriculumSemester.findOneAndUpdate(
        { curriculumId: curriculumObjectId, semesterId },
        {
          $set: { isActive: true },
          $setOnInsert: { curriculumId: curriculumObjectId, semesterId },
        },
        { upsert: true, returnDocument: "after", runValidators: true },
      );
    } catch (error) {
      if (!isDuplicateKey(error)) throw error;
    }
  }

  return listCurriculumSemesters(curriculumId, true);
}

export async function archiveCurriculumSemester(curriculumId: string, semesterId: string) {
  const curriculumObjectId = parseObjectId(curriculumId, "curriculumId");
  const semesterObjectId = parseObjectId(semesterId, "semesterId");
  const link = await CurriculumSemester.findOne({
    curriculumId: curriculumObjectId,
    semesterId: semesterObjectId,
  });
  if (!link) notFound("curriculumSemester");

  const [users, slots] = await Promise.all([
    User.countDocuments({
      curriculumId: curriculumObjectId,
      currentSemesterId: semesterObjectId,
    }),
    CourseSlot.countDocuments({
      curriculumId: curriculumObjectId,
      semesterId: semesterObjectId,
      isActive: true,
    }),
  ]);
  if (users > 0 || slots > 0) {
    conflict("Curriculum semester is in use by student profiles or course slots");
  }

  link.isActive = false;
  await link.save();
  return toCurriculumSemesterResponse(link);
}

async function assertActiveCurriculumAndSubject(
  curriculumId: Types.ObjectId,
  subjectId: Types.ObjectId,
) {
  const [curriculum, subject] = await Promise.all([
    Curriculum.findOne({ _id: curriculumId, isActive: true }),
    Subject.findOne({ _id: subjectId, isActive: true }),
  ]);
  if (!curriculum) notFound("curriculum");
  if (!subject) notFound("subject");
}

export async function createCourseSlot(input: {
  curriculumId: string;
  semesterId: string;
  subjectId: string;
}) {
  const curriculumId = parseObjectId(input.curriculumId, "curriculumId");
  const semesterId = parseObjectId(input.semesterId, "semesterId");
  const subjectId = parseObjectId(input.subjectId, "subjectId");
  await assertActiveCurriculumAndSubject(curriculumId, subjectId);
  await assertActiveCurriculumSemester(curriculumId, semesterId);
  try {
    const slot = await CourseSlot.create({ curriculumId, semesterId, subjectId });
    return enrichCourseSlots([slot]).then((items) => items[0]!);
  } catch (error) {
    if (isDuplicateKey(error)) conflict("Course slot already exists");
    throw error;
  }
}

export async function createCourseSlotsBulk(input: {
  curriculumId: string;
  semesterId: string;
  subjectIds: string[];
}) {
  const curriculumId = parseObjectId(input.curriculumId, "curriculumId");
  const semesterId = parseObjectId(input.semesterId, "semesterId");
  const subjectObjectIds = input.subjectIds.map((id) => parseObjectId(id, "subjectId"));

  const curriculum = await Curriculum.findOne({ _id: curriculumId, isActive: true });
  if (!curriculum) notFound("curriculum");
  await assertActiveCurriculumSemester(curriculumId, semesterId);

  const activeSubjects = await Subject.find({ _id: { $in: subjectObjectIds }, isActive: true });
  const activeSubjectIds = new Set(activeSubjects.map((subject) => subject._id.toString()));

  const created: CourseSlotDocument[] = [];
  const skipped: { subjectId: string; reason: string }[] = [];

  for (const subjectId of subjectObjectIds) {
    if (!activeSubjectIds.has(subjectId.toString())) {
      skipped.push({ subjectId: subjectId.toString(), reason: "Subject not found or inactive" });
      continue;
    }
    try {
      const slot = await CourseSlot.create({ curriculumId, semesterId, subjectId });
      created.push(slot);
    } catch (error) {
      if (isDuplicateKey(error)) {
        skipped.push({ subjectId: subjectId.toString(), reason: "Course slot already exists" });
        continue;
      }
      throw error;
    }
  }

  return {
    created: await enrichCourseSlots(created),
    skipped,
  };
}

async function assertSlotNotSelected(slot: CourseSlotDocument): Promise<void> {
  const selected = await User.countDocuments({
    curriculumId: slot.curriculumId,
    currentSemesterId: slot.semesterId,
    currentSubjectIds: slot.subjectId,
  });
  if (selected > 0) conflict("Course slot is selected by active student profiles");
}

export async function updateCourseSlot(
  slotId: string,
  input: { curriculumId?: string; semesterId?: string; subjectId?: string; isActive?: boolean },
) {
  const slot = await CourseSlot.findById(parseObjectId(slotId));
  if (!slot) notFound("courseSlot");

  const changesIdentity =
    input.curriculumId !== undefined ||
    input.semesterId !== undefined ||
    input.subjectId !== undefined;
  if (changesIdentity || (input.isActive === false && slot.isActive)) {
    await assertSlotNotSelected(slot);
  }
  if (changesIdentity) {
    const referencedDocuments = await Document.countDocuments({ courseSlotId: slot._id });
    if (referencedDocuments > 0) {
      conflict("Course slot identity is immutable after documents reference it");
    }
  }

  const curriculumId = input.curriculumId
    ? parseObjectId(input.curriculumId, "curriculumId")
    : slot.curriculumId;
  const semesterId = input.semesterId
    ? parseObjectId(input.semesterId, "semesterId")
    : slot.semesterId;
  const subjectId = input.subjectId
    ? parseObjectId(input.subjectId, "subjectId")
    : slot.subjectId;
  if (changesIdentity || input.isActive === true) {
    await assertActiveCurriculumAndSubject(
      curriculumId as Types.ObjectId,
      subjectId as Types.ObjectId,
    );
    await assertActiveCurriculumSemester(
      curriculumId as Types.ObjectId,
      semesterId as Types.ObjectId,
    );
  }

  slot.curriculumId = curriculumId;
  slot.semesterId = semesterId;
  slot.subjectId = subjectId;
  if (input.isActive !== undefined) slot.isActive = input.isActive;

  try {
    await slot.save();
  } catch (error) {
    if (isDuplicateKey(error)) conflict("Course slot already exists");
    throw error;
  }
  return enrichCourseSlots([slot]).then((items) => items[0]!);
}

export async function archiveCourseSlot(slotId: string) {
  return updateCourseSlot(slotId, { isActive: false });
}

export async function listCourseSlots(options: {
  curriculumId?: string | undefined;
  semesterId?: string | undefined;
  includeInactive?: boolean | undefined;
}) {
  const filter: Record<string, unknown> = {};
  if (options.curriculumId) filter.curriculumId = parseObjectId(options.curriculumId, "curriculumId");
  if (options.semesterId) filter.semesterId = parseObjectId(options.semesterId, "semesterId");
  if (!options.includeInactive) filter.isActive = true;

  const slots = await CourseSlot.find(filter).sort({ semesterId: 1, subjectId: 1 });
  return enrichCourseSlots(slots);
}

async function enrichCourseSlots(slots: CourseSlotDocument[]) {
  const curriculumIds = [...new Set(slots.map((slot) => slot.curriculumId.toString()))];
  const subjectIds = [...new Set(slots.map((slot) => slot.subjectId.toString()))];
  const semesterIds = [...new Set(slots.map((slot) => slot.semesterId.toString()))];
  const [curricula, subjects, semesters] = await Promise.all([
    Curriculum.find({ _id: { $in: curriculumIds } }),
    Subject.find({ _id: { $in: subjectIds } }),
    Semester.find({ _id: { $in: semesterIds } }),
  ]);
  const curriculumMap = new Map(
    curricula.map((curriculum) => [curriculum._id.toString(), toCurriculumResponse(curriculum)]),
  );
  const subjectMap = new Map(
    subjects.map((subject) => [subject._id.toString(), toSubjectResponse(subject)]),
  );
  const semesterMap = new Map(
    semesters.map((semester) => [semester._id.toString(), toSemesterResponse(semester)]),
  );
  return slots.map((slot) => ({
    ...toCourseSlotResponse(slot),
    curriculum: curriculumMap.get(slot.curriculumId.toString()) ?? null,
    subject: subjectMap.get(slot.subjectId.toString()) ?? null,
    semester: semesterMap.get(slot.semesterId.toString()) ?? null,
  }));
}

export async function listCatalogCurricula() {
  return listCurricula(false);
}

export async function listCatalogSemesters() {
  return listSemesters(false);
}

export async function listCatalogCurriculumSemesters(curriculumId: string) {
  return listCurriculumSemesters(curriculumId, false);
}

export async function listCatalogCourseSlots(curriculumId: string, semesterId?: string) {
  const curriculumObjectId = parseObjectId(curriculumId, "curriculumId");
  const curriculum = await Curriculum.findOne({ _id: curriculumObjectId, isActive: true });
  if (!curriculum) notFound("curriculum");

  const filter: Record<string, unknown> = { curriculumId: curriculumObjectId, isActive: true };
  if (semesterId !== undefined) {
    filter.semesterId = parseObjectId(semesterId, "semesterId");
  }
  const slots = await CourseSlot.find(filter).sort({ semesterId: 1, subjectId: 1 });
  const subjectIds = slots.map((slot) => slot.subjectId);
  const activeSubjects = new Set(
    (await Subject.find({ _id: { $in: subjectIds }, isActive: true }).select("_id")).map(
      (subject) => subject._id.toString(),
    ),
  );
  return enrichCourseSlots(
    slots.filter((slot) => activeSubjects.has(slot.subjectId.toString())),
  );
}

export async function assertUserCanUseCourseSlot(
  user: UserDocument,
  courseSlotId: string,
): Promise<CourseSlotDocument> {
  if (!user.curriculumId) {
    throw createAppError(ErrorCode.ACADEMIC_PROFILE_REQUIRED, 409);
  }
  const slot = await CourseSlot.findOne({
    _id: parseObjectId(courseSlotId, "courseSlotId"),
    curriculumId: user.curriculumId,
    isActive: true,
  });
  if (!slot) throw createAppError(ErrorCode.COURSE_SLOT_NOT_IN_PROFILE, 403);
  await assertActiveCurriculumAndSubject(
    slot.curriculumId as Types.ObjectId,
    slot.subjectId as Types.ObjectId,
  );
  return slot;
}

export async function getAcademicProfile(user: UserDocument) {
  const [curriculum, subjects, semester] = await Promise.all([
    user.curriculumId ? Curriculum.findById(user.curriculumId) : null,
    Subject.find({ _id: { $in: user.currentSubjectIds } }).sort({ code: 1 }),
    user.currentSemesterId ? Semester.findById(user.currentSemesterId) : null,
  ]);
  return {
    curriculum: curriculum ? toCurriculumResponse(curriculum) : null,
    currentSemester: semester ? toSemesterResponse(semester) : null,
    currentSubjects: subjects.map(toSubjectResponse),
    isComplete: Boolean(curriculum),
  };
}

export async function updateAcademicProfile(
  user: UserDocument,
  input: { curriculumId: string; currentSemesterId?: string; currentSubjectIds?: string[] },
) {
  const curriculumId = parseObjectId(input.curriculumId, "curriculumId");
  const curriculum = await Curriculum.findOne({ _id: curriculumId, isActive: true });
  if (!curriculum) notFound("curriculum");

  const updated = await User.findByIdAndUpdate(
    user._id,
    { $set: { curriculumId, currentSemesterId: null, currentSubjectIds: [] } },
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
