import { createAppError, ErrorCode } from "../errors/error-codes";
import { CurriculumCourse } from "../models/curriculum-course.model";
import { Document, type DocumentDocument } from "../models/document.model";
import { Major } from "../models/major.model";
import { Subject } from "../models/subject.model";
import { User, type UserDocument } from "../models/user.model";
import { parseObjectId } from "../utils/objectId";
import * as s3Service from "./s3.service";

interface LibraryOptions {
  page: number;
  limit: number;
  search?: string | undefined;
  majorId?: string | undefined;
  semesterNumber?: number | undefined;
  subjectId?: string | undefined;
  sort: "newest" | "oldest" | "title";
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function serializeLibraryDocuments(documents: DocumentDocument[]) {
  const courseIds = documents
    .map((document) => document.curriculumCourseId?.toString())
    .filter((id): id is string => Boolean(id));
  const courses = await CurriculumCourse.find({ _id: { $in: courseIds } });
  const majorIds = [...new Set(courses.map((course) => course.majorId.toString()))];
  const subjectIds = [...new Set(courses.map((course) => course.subjectId.toString()))];
  const ownerIds = [...new Set(documents.map((document) => document.ownerId.toString()))];
  const [majors, subjects, owners] = await Promise.all([
    Major.find({ _id: { $in: majorIds } }).select("code name isActive"),
    Subject.find({ _id: { $in: subjectIds } }).select("code name isActive"),
    User.find({ _id: { $in: ownerIds } }).select("displayName avatarUrl"),
  ]);
  const courseMap = new Map(courses.map((course) => [course._id.toString(), course]));
  const majorMap = new Map(majors.map((major) => [major._id.toString(), major]));
  const subjectMap = new Map(subjects.map((subject) => [subject._id.toString(), subject]));
  const ownerMap = new Map(owners.map((owner) => [owner._id.toString(), owner]));

  return documents.map((document) => {
    const course = document.curriculumCourseId
      ? courseMap.get(document.curriculumCourseId.toString())
      : undefined;
    const major = course ? majorMap.get(course.majorId.toString()) : undefined;
    const subject = course ? subjectMap.get(course.subjectId.toString()) : undefined;
    const owner = ownerMap.get(document.ownerId.toString());
    return {
      id: document._id.toString(),
      title: document.title,
      originalFilename: document.originalFilename,
      mimeType: document.mimeType,
      fileSizeBytes: document.fileSizeBytes,
      status: document.status,
      pageCount: document.pageCount ?? null,
      tags: document.tags,
      visibility: document.visibility,
      curriculumCourse: course
        ? {
            id: course._id.toString(),
            semesterNumber: course.semesterNumber,
            major: major
              ? { id: major._id.toString(), code: major.code, name: major.name }
              : null,
            subject: subject
              ? { id: subject._id.toString(), code: subject.code, name: subject.name }
              : null,
          }
        : null,
      owner: owner
        ? {
            id: owner._id.toString(),
            displayName: owner.displayName,
            avatarUrl: owner.avatarUrl ?? null,
          }
        : null,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };
  });
}

export async function listDocuments(options: LibraryOptions) {
  const curriculumFilter: Record<string, unknown> = {};
  if (options.majorId) curriculumFilter.majorId = parseObjectId(options.majorId, "majorId");
  if (options.semesterNumber !== undefined) {
    curriculumFilter.semesterNumber = options.semesterNumber;
  }
  if (options.subjectId) {
    curriculumFilter.subjectId = parseObjectId(options.subjectId, "subjectId");
  }

  const filter: Record<string, unknown> = {
    visibility: "internal",
    deletedAt: null,
    status: { $ne: "pending" },
    curriculumCourseId: { $ne: null },
  };
  if (Object.keys(curriculumFilter).length > 0) {
    const courseIds = await CurriculumCourse.find(curriculumFilter).distinct("_id");
    filter.curriculumCourseId = { $in: courseIds };
  }
  if (options.search) filter.title = { $regex: escapeRegex(options.search), $options: "i" };

  const sort =
    options.sort === "oldest"
      ? { createdAt: 1 as const }
      : options.sort === "title"
        ? { title: 1 as const }
        : { createdAt: -1 as const };
  const skip = (options.page - 1) * options.limit;
  const [documents, total] = await Promise.all([
    Document.find(filter).sort(sort).skip(skip).limit(options.limit),
    Document.countDocuments(filter),
  ]);

  return {
    documents: await serializeLibraryDocuments(documents),
    pagination: {
      page: options.page,
      limit: options.limit,
      total,
      totalPages: Math.ceil(total / options.limit),
    },
  };
}

export async function getDocument(
  _user: UserDocument,
  documentId: string,
  includeDownloadUrl: boolean,
) {
  const document = await Document.findOne({
    _id: parseObjectId(documentId),
    visibility: "internal",
    curriculumCourseId: { $ne: null },
    deletedAt: null,
    status: { $ne: "pending" },
  });
  if (!document) throw createAppError(ErrorCode.DOCUMENT_NOT_FOUND, 404);

  const [serialized] = await serializeLibraryDocuments([document]);
  if (!serialized) throw createAppError(ErrorCode.DOCUMENT_NOT_FOUND, 404);
  return {
    ...serialized,
    ...(includeDownloadUrl
      ? { downloadUrl: await s3Service.createPresignedGetUrl(document.s3Key) }
      : {}),
  };
}
