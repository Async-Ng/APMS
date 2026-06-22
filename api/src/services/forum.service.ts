import { Types } from "mongoose";

import { createAppError, ErrorCode } from "../errors/error-codes";
import { CurriculumCourse } from "../models/curriculum-course.model";
import { Document, type DocumentDocument } from "../models/document.model";
import { type UserDocument } from "../models/user.model";
import { parseObjectId } from "../utils/objectId";
import {
  serializeLibraryDocuments,
} from "./library.service";
import * as s3Service from "./s3.service";

export const FORUM_MATCH_TYPES = [
  "exact_course",
  "same_subject_other_semester",
] as const;
export type ForumMatchType = (typeof FORUM_MATCH_TYPES)[number];

export interface ForumDocumentItem {
  id: string;
  matchType: ForumMatchType;
  title: string;
  originalFilename: string;
  mimeType: string;
  fileSizeBytes: number;
  status: string;
  pageCount: number | null;
  tags: string[];
  visibility: string;
  curriculumCourse: {
    id: string;
    semesterNumber: number;
    major: { id: string; code: string; name: string } | null;
    subject: { id: string; code: string; name: string } | null;
  } | null;
  owner: { id: string; displayName: string; avatarUrl: string | null } | null;
  createdAt: Date;
  updatedAt: Date;
  downloadUrl?: string;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sortSpec(sort: "newest" | "oldest" | "title") {
  if (sort === "oldest") return { createdAt: 1 as const, _id: 1 as const };
  if (sort === "title") return { title: 1 as const, _id: 1 as const };
  return { createdAt: -1 as const, _id: -1 as const };
}

function requireAcademicProfile(user: UserDocument): {
  majorId: Types.ObjectId;
  currentSemester: number;
  currentSubjectIds: Types.ObjectId[];
} {
  if (!user.majorId || !user.currentSemester || user.currentSubjectIds.length === 0) {
    throw createAppError(ErrorCode.ACADEMIC_PROFILE_REQUIRED, 409);
  }

  return {
    majorId: user.majorId as Types.ObjectId,
    currentSemester: user.currentSemester,
    currentSubjectIds: user.currentSubjectIds as Types.ObjectId[],
  };
}

async function buildForumScope(user: UserDocument) {
  const profile = requireAcademicProfile(user);
  const exactCourses = await CurriculumCourse.find({
    majorId: profile.majorId,
    semesterNumber: profile.currentSemester,
    subjectId: { $in: profile.currentSubjectIds },
    isActive: true,
  }).select("_id subjectId");

  const exactCourseIds = exactCourses.map((course) => course._id);
  const exactSubjectIds = [...new Set(exactCourses.map((course) => course.subjectId.toString()))];

  const relatedCourses =
    exactSubjectIds.length === 0
      ? []
      : await CurriculumCourse.find({
          majorId: profile.majorId,
          subjectId: { $in: exactSubjectIds.map((id) => parseObjectId(id, "subjectId")) },
          semesterNumber: { $ne: profile.currentSemester },
          isActive: true,
        }).select("_id");

  const relatedCourseIds = relatedCourses
    .map((course) => course._id)
    .filter((courseId) => !exactCourseIds.some((exactId) => exactId.equals(courseId)));

  return {
    exactCourseIds,
    relatedCourseIds,
  };
}

async function serializeForumDocuments(
  docs: DocumentDocument[],
  matchTypeByDocumentId: Map<string, ForumMatchType>,
) {
  const serialized = await serializeLibraryDocuments(docs);
  return serialized.map((doc) => ({
    ...doc,
    matchType: matchTypeByDocumentId.get(doc.id) ?? "same_subject_other_semester",
  })) as ForumDocumentItem[];
}

function buildForumFilter(courseIds: Types.ObjectId[], search?: string) {
  const filter: Record<string, unknown> = {
    visibility: "internal",
    deletedAt: null,
    status: { $ne: "pending" },
    curriculumCourseId: { $in: courseIds },
  };
  if (search) {
    filter.title = { $regex: escapeRegex(search), $options: "i" };
  }
  return filter;
}

export async function listForumDocuments(options: {
  user: UserDocument;
  page: number;
  limit: number;
  search?: string | undefined;
  sort: "newest" | "oldest" | "title";
}) {
  const { exactCourseIds, relatedCourseIds } = await buildForumScope(options.user);
  const exactFilter = buildForumFilter(exactCourseIds, options.search);
  const relatedFilter = buildForumFilter(relatedCourseIds, options.search);
  const [exactCount, relatedCount] = await Promise.all([
    exactCourseIds.length > 0 ? Document.countDocuments(exactFilter) : Promise.resolve(0),
    relatedCourseIds.length > 0 ? Document.countDocuments(relatedFilter) : Promise.resolve(0),
  ]);

  const total = exactCount + relatedCount;
  const skip = (options.page - 1) * options.limit;
  const end = skip + options.limit;
  const sort = sortSpec(options.sort);

  const exactDocsNeeded = skip < exactCount ? Math.min(end, exactCount) - skip : 0;
  const relatedDocsNeeded = end > exactCount ? Math.min(end - exactCount, relatedCount) : 0;
  const relatedSkip = Math.max(0, skip - exactCount);

  const [exactDocs, relatedDocs] = await Promise.all([
    exactDocsNeeded > 0
      ? Document.find(exactFilter).sort(sort).skip(skip).limit(exactDocsNeeded)
      : Promise.resolve([] as DocumentDocument[]),
    relatedDocsNeeded > 0
      ? Document.find(relatedFilter).sort(sort).skip(relatedSkip).limit(relatedDocsNeeded)
      : Promise.resolve([] as DocumentDocument[]),
  ]);

  const documents = [...exactDocs, ...relatedDocs];
  const matchTypeByDocumentId = new Map<string, ForumMatchType>();
  for (const doc of exactDocs) {
    matchTypeByDocumentId.set(doc._id.toString(), "exact_course");
  }
  for (const doc of relatedDocs) {
    matchTypeByDocumentId.set(doc._id.toString(), "same_subject_other_semester");
  }

  return {
    documents: await serializeForumDocuments(documents, matchTypeByDocumentId),
    pagination: {
      page: options.page,
      limit: options.limit,
      total,
      totalPages: Math.ceil(total / options.limit),
    },
  };
}

export async function getForumDocument(
  user: UserDocument,
  documentId: string,
  includeDownloadUrl: boolean,
): Promise<ForumDocumentItem> {
  const { exactCourseIds, relatedCourseIds } = await buildForumScope(user);
  const allowedCourseIds = [...exactCourseIds, ...relatedCourseIds];
  const document = await Document.findOne({
    _id: parseObjectId(documentId),
    visibility: "internal",
    curriculumCourseId: { $in: allowedCourseIds },
    deletedAt: null,
    status: { $ne: "pending" },
  });
  if (!document) {
    throw createAppError(ErrorCode.DOCUMENT_NOT_FOUND, 404);
  }

  const [serialized] = await serializeForumDocuments([document], new Map());
  if (!serialized) {
    throw createAppError(ErrorCode.DOCUMENT_NOT_FOUND, 404);
  }

  const matchType = exactCourseIds.some((courseId) =>
    courseId.equals(document.curriculumCourseId as Types.ObjectId),
  )
    ? "exact_course"
    : "same_subject_other_semester";

  return {
    ...serialized,
    matchType,
    ...(includeDownloadUrl ? { downloadUrl: await s3Service.createPresignedGetUrl(document.s3Key) } : {}),
  };
}
